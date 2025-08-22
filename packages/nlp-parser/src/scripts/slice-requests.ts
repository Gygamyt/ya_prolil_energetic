// scripts/slice-requests.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import mammoth from 'mammoth';
// --- ИСПРАВЛЕНИЕ ---
import { fileURLToPath } from 'url';

// ↓↓↓ ВОТ ЭТИ 2 СТРОКИ РЕШАЮТ ПРОБЛЕМУ ↓↓↓
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- КОНЕЦ ИСПРАВЛЕНИЯ ---


// --- Конфигурация (теперь работает) ---
const INPUT_FILE_PATH = path.resolve(__dirname, '../data/all-requests.docx');
const OUTPUT_DIR = path.resolve(__dirname, '../data/requests-tmp');
const REQUEST_SPLIT_PATTERN = /^(CV - .*[\r\n]+https:\/\/innowisegroup2\.my\.salesforce\.com\/.*)/m;


/**
 * Главная функция скрипта
 */
async function main() {
    console.log(`Начинаем нарезку файла: ${INPUT_FILE_PATH}`);

    try {
        // 1. Убедимся, что выходная директория существует и она пуста
        await fs.rm(OUTPUT_DIR, { recursive: true, force: true });
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`Выходная директория очищена и создана: ${OUTPUT_DIR}`);

        // 2. Читаем .docx файл
        const { value: rawText } = await mammoth.extractRawText({ path: INPUT_FILE_PATH });
        if (!rawText) {
            throw new Error('Не удалось извлечь текст из DOCX файла.');
        }
        console.log(`Файл успешно прочитан, всего символов: ${rawText.length}`);

        // 3. Разбиваем весь текст на отдельные заявки
        const parts = rawText.split(REQUEST_SPLIT_PATTERN);

        const requests: string[] = [];
        for (let i = 1; i < parts.length; i += 2) {
            const header = parts[i];
            const body = parts[i + 1] || '';
            if (header.trim()) {
                requests.push((header + body).trim());
            }
        }

        if (requests.length === 0) {
            console.warn('Не найдено ни одной заявки по паттерну. Проверьте разделитель.');
            return;
        }
        console.log(`Найдено и нарезано заявок: ${requests.length}`);

        // 4. Сохраняем каждую заявку в отдельный .txt файл
        for (let i = 0; i < requests.length; i++) {
            const requestContent = requests[i];
            const outputFilePath = path.join(OUTPUT_DIR, `request-${i + 1}.txt`);
            await fs.writeFile(outputFilePath, requestContent, 'utf-8');
        }

        console.log(`\n🎉 Успешно сохранено ${requests.length} заявок в директорию: ${OUTPUT_DIR}`);

    } catch (error) {
        console.error('\n❌ Произошла ошибка во время выполнения скрипта:');
        console.error(error);
        process.exit(1);
    }
}

main();

