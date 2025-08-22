// scripts/analyze-results.ts

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Конфигурация ---
const INPUT_FILE_PATH = path.resolve(__dirname, '../data/processing-results.json');
const OUTPUT_FILE_PATH = path.resolve(__dirname, '../data/summary_stats.json');

// --- Типы для удобства ---
interface ProcessedResult {
    sourceFile: string;
    status: 'success' | 'no_entities_found' | 'error';
    data: {
        technologies: string[];
        platforms: string[];
        skills: string[];
        domains: string[];
        roles: string[];
    } | null;
}

interface StatItem {
    count: number;
    percentage: number;
}

interface Summary {
    totalProcessedRequests: number;
    technologies: Record<string, StatItem>;
    platforms: Record<string, StatItem>;
    skills: Record<string, StatItem>;
    domains: Record<string, StatItem>;
    roles: Record<string, StatItem>;
}

/**
 * Главная функция скрипта
 */
async function main() {
    console.log(`Начинаем анализ файла: ${INPUT_FILE_PATH}`);

    try {
        // 1. Читаем JSON с результатами обработки
        const fileContent = await fs.readFile(INPUT_FILE_PATH, 'utf-8');
        const results: ProcessedResult[] = JSON.parse(fileContent);

        // 2. Инициализируем счетчики
        const counters = {
            technologies: new Map<string, number>(),
            platforms: new Map<string, number>(),
            skills: new Map<string, number>(),
            domains: new Map<string, number>(),
            roles: new Map<string, number>(),
        };

        // Считаем только те заявки, где были найдены сущности
        const validEntries = results.filter(r => r.status === 'success' && r.data);
        const totalProcessedCount = validEntries.length;

        if (totalProcessedCount === 0) {
            console.warn('Не найдено успешно обработанных заявок для анализа.');
            return;
        }

        // 3. Проходим по всем заявкам и считаем сущности
        for (const entry of validEntries) {
            if (entry.data) {
                for (const key in counters) {
                    const prop = key as keyof typeof counters;
                    const items = entry.data[prop] || [];
                    for (const item of items) {
                        counters[prop].set(item, (counters[prop].get(item) || 0) + 1);
                    }
                }
            }
        }

        // 4. Формируем итоговый объект со статистикой
        const summary: Summary = {
            totalProcessedRequests: totalProcessedCount,
            technologies: {}, platforms: {}, skills: {}, domains: {}, roles: {},
        };

        for (const key in counters) {
            const prop = key as keyof typeof counters;
            const sortedEntries = [...counters[prop].entries()].sort((a, b) => b[1] - a[1]);

            for (const [name, count] of sortedEntries) {
                summary[prop][name] = {
                    count,
                    percentage: parseFloat(((count / totalProcessedCount) * 100).toFixed(2)),
                };
            }
        }

        // 5. Сохраняем статистику в новый JSON-файл
        await fs.writeFile(OUTPUT_FILE_PATH, JSON.stringify(summary, null, 2), 'utf-8');

        console.log(`\n🎉 Анализ завершен!`);
        console.log(`- Проанализировано заявок: ${totalProcessedCount}`);
        console.log(`- Статистика сохранена в файл: ${OUTPUT_FILE_PATH}`);

    } catch (error) {
        console.error('\n❌ Произошла ошибка во время выполнения скрипта:');
        console.error(error);
        process.exit(1);
    }
}

main();
