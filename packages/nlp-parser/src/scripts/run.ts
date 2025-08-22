// run.ts

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { RegexStrategy } from "../strategies/regex-strategy";
import { ParseInput } from "../types";

/**
 * Главная функция для запуска парсера
 */
async function main() {
    console.log('--- Запуск парсера ---');

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const inputFilePath = path.join(__dirname, 'input.txt');

    let fileContent: string;

    try {
        fileContent = fs.readFileSync(inputFilePath, 'utf-8');
        console.log(`Успешно прочитан файл: ${inputFilePath}`);
    } catch (error) {
        console.error(`Ошибка чтения файла: ${inputFilePath}`);
        console.error(error);
        return;
    }

    const strategy = new RegexStrategy();
    const input: ParseInput = {
        data: fileContent,
        parseStrategy: 'standard'
    };

    console.log('\n--- Начало парсинга ---');
    const result = await strategy.parse(input);
    console.log('--- Парсинг завершен ---\n');

    // --- НОВЫЙ БЛОК: СОХРАНЕНИЕ В ФАЙЛ ---
    const outputFilePath = path.join(__dirname, 'output.json');
    const jsonOutput = JSON.stringify(result, null, 2); // Форматируем JSON для читаемости

    try {
        fs.writeFileSync(outputFilePath, jsonOutput, 'utf-8');
        console.log(`Результат успешно сохранен в файл: ${outputFilePath}`);
    } catch (error) {
        console.error(`Ошибка при сохранении файла: ${outputFilePath}`);
        console.error(error);
    }
    // --- КОНЕЦ НОВОГО БЛОКА ---

    // Выводим результат в консоль, как и раньше
    console.log('\nРезультат парсинга (в консоли):');
    console.log(jsonOutput);
}

// Запускаем главную функцию
main().catch(error => {
    console.error('Произошла непредвиденная ошибка:', error);
});
