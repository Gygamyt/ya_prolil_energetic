// scripts/process-requests.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { manager } from '../nlp/nlp-manager';
import { fileURLToPath } from 'url';
import { PrimaryRequirements, PrimaryRequirementsNLPExtractor } from "../extractors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Конфигурация ---
const INPUT_DIR = path.resolve(__dirname, '../data/requests-tmp');
const OUTPUT_JSON_PATH = path.resolve(__dirname, '../data/processing-results.json');
const OUTPUT_TEXTS_DIR = path.resolve(__dirname, '../data/processed-texts');

const FIELD_14_PATTERN = /14\.\s*Подробные требования к разработчику([\s\S]*?)(?=\n\d+\.\s*|$)/;

interface ProcessedResult {
    sourceFile: string;
    status: 'success' | 'no_entities_found' | 'error';
    rawText: string | null;
    data: PrimaryRequirements | null;
    error?: string;
}

/**
 * Главная функция скрипта
 */
async function main() {
    // ↓↓↓ ИЗМЕНЕНИЕ 1: ЗАПУСКАЕМ ТАЙМЕР ↓↓↓
    const startTime = process.hrtime();
    console.log('Начинаем пакетную обработку заявок...');

    const allResults: ProcessedResult[] = [];

    try {
        // ... (очистка директорий и обучение модели) ...
        await fs.rm(OUTPUT_JSON_PATH, { force: true });
        await fs.rm(OUTPUT_TEXTS_DIR, { recursive: true, force: true });
        await fs.mkdir(OUTPUT_TEXTS_DIR, { recursive: true });
        console.log(`Выходные директории очищены и созданы.`);

        console.log('Предварительное обучение NLP-модели...');
        await manager.train();
        console.log('Модель успешно обучена.');

        const extractor = new PrimaryRequirementsNLPExtractor();
        const files = await fs.readdir(INPUT_DIR);
        const requestFiles = files.filter(f => f.endsWith('.txt'));

        if (requestFiles.length === 0) {
            console.warn(`В директории ${INPUT_DIR} не найдено .txt файлов для обработки.`);
            return;
        }
        console.log(`Найдено для обработки: ${requestFiles.length} файлов.`);

        // ... (цикл обработки файлов) ...
        for (const fileName of requestFiles) {
            const filePath = path.join(INPUT_DIR, fileName);
            console.log(`> Обработка файла: ${fileName}`);

            const fileContent = await fs.readFile(filePath, 'utf-8');
            const match = fileContent.match(FIELD_14_PATTERN);
            const rawField14Text = match ? match[1] : null;

            if (!rawField14Text) {
                console.log(`  -> Поле 14 не найдено, файл пропущен.`);
                continue;
            }

            const outputTextPath = path.join(OUTPUT_TEXTS_DIR, fileName);
            await fs.writeFile(outputTextPath, rawField14Text, 'utf-8');

            const textToProcess = rawField14Text.trim();

            try {
                const extractionResult = await extractor.extract(textToProcess);
                const status = extractionResult.value ? 'success' : 'no_entities_found';
                allResults.push({
                    sourceFile: fileName,
                    status,
                    rawText: rawField14Text,
                    data: extractionResult.value as PrimaryRequirements,
                });
            } catch (e) {
                allResults.push({
                    sourceFile: fileName,
                    status: 'error',
                    rawText: rawField14Text,
                    data: null,
                    error: e instanceof Error ? e.message : String(e),
                });
            }
        }

        await fs.writeFile(OUTPUT_JSON_PATH, JSON.stringify(allResults, null, 2), 'utf-8');

        // ↓↓↓ ИЗМЕНЕНИЕ 2: ОСТАНАВЛИВАЕМ ТАЙМЕР И СЧИТАЕМ СТАТИСТИКУ ↓↓↓
        const elapsed = process.hrtime(startTime);
        const elapsedSeconds = elapsed[0] + elapsed[1] / 1e9;
        const processedCount = allResults.length;
        const averageTime = processedCount > 0 ? elapsedSeconds / processedCount : 0;

        console.log(`\n🎉 Пакетная обработка завершена!`);
        console.log(`- Обработано файлов с полем 14: ${processedCount}`);
        console.log(`- Итоговый JSON сохранен в: ${OUTPUT_JSON_PATH}`);
        console.log(`- Тексты полей сохранены в: ${OUTPUT_TEXTS_DIR}`);
        console.log('---');
        console.log('📊 Статистика производительности:');
        console.log(`- Общее время выполнения: ${elapsedSeconds.toFixed(2)} сек.`);
        console.log(`- Среднее время на файл: ${averageTime.toFixed(3)} сек.`);

    } catch (error) {
        console.error('\n❌ Произошла критическая ошибка во время выполнения скрипта:');
        console.error(error);
        process.exit(1);
    }
}

main();
