import * as fs from 'fs/promises';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

interface TechStats {
    count: number;
    percentage: number;
}

interface StatsData {
    totalProcessedRequests: number;
    technologies: Record<string, TechStats>;
}

const MAX_TECHNOLOGIES_TO_SHOW = 20;

const CHART_CONFIG = {
    barTotalLength: 40,
    barFilledChar: '█',
    barEmptyChar: '░',
    techColumnWidth: 21,
    countColumnWidth: 6,
    percentColumnWidth: 5,
};

/**
 * Отображает в консоли текстовый график статистики по технологиям.
 * @param data - Объект со статистическими данными.
 * @param maxItems - Максимальное количество строк для вывода.
 */
function displayStatsChart(data: StatsData, maxItems: number = MAX_TECHNOLOGIES_TO_SHOW): void {
    const { technologies, totalProcessedRequests } = data;

    const topTechnologies = Object.entries(technologies)
        .sort(([, statsA], [, statsB]) => statsB.percentage - statsA.percentage)
        .slice(0, maxItems);

    console.log(`\n📊 Топ-${maxItems} технологий из ${totalProcessedRequests} обработанных заявок:\n`);
    const header = [
        'Технология'.padEnd(CHART_CONFIG.techColumnWidth),
        'Кол-во'.padStart(CHART_CONFIG.countColumnWidth),
        ' '.repeat(CHART_CONFIG.barTotalLength / 2 - 3) + 'График' + ' '.repeat(CHART_CONFIG.barTotalLength / 2 - 3),
        '%'
    ].join(' | ');
    console.log(header);
    console.log('-'.repeat(header.length));
    for (const [tech, { count, percentage }] of topTechnologies) {
        const filledLength = Math.round((percentage / 100) * CHART_CONFIG.barTotalLength);
        const emptyLength = CHART_CONFIG.barTotalLength - filledLength;
        const bar = CHART_CONFIG.barFilledChar.repeat(filledLength) + CHART_CONFIG.barEmptyChar.repeat(emptyLength);

        const techCol = tech.padEnd(CHART_CONFIG.techColumnWidth);
        const countCol = count.toString().padStart(CHART_CONFIG.countColumnWidth);
        const percentCol = `${percentage.toFixed(2).padStart(CHART_CONFIG.percentColumnWidth)}%`;

        console.log(`${techCol} | ${countCol} | ${bar} | ${percentCol}`);
    }
}

/**
 * Главная асинхронная функция для запуска скрипта.
 * Читает и парсит JSON-файл, после чего вызывает функцию отрисовки.
 */
async function main() {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);

        const statsFilePath = resolve(__dirname, '../data/summary_stats.json');

        const rawData = await fs.readFile(statsFilePath, 'utf-8');
        const stats: StatsData = JSON.parse(rawData);

        displayStatsChart(stats);

    } catch (error) {
        console.error('❌ Произошла ошибка при чтении или обработке файла статистики:', error);
        process.exit(1);
    }
}

main();
