// @ts-ignore
import { NlpManager } from 'node-nlp';
import { nlpEntities } from "./data";

// 1. Правильная инициализация NlpManager для v4
// Опция forceNER: true обязательна для активации NER
const manager = new NlpManager({
    languages: ['ru', 'en'], // Добавляем русский и английский
    forceNER: true
});

// 2. Динамическое добавление сущностей из файла конфигурации
console.log('Загрузка кастомных NLP-сущностей...');
for (const entity of nlpEntities) {
    for (const option of entity.options) {
        manager.addNamedEntityText(
            entity.name,      // Имя сущности (e.g., 'technology', 'grade')
            option.name,      // Вариант (e.g., 'nodejs', 'senior')
            entity.languages, // Массив языков ['ru', 'en']
            option.synonyms   // Массив синонимов (e.g., ['Node.js', 'нода'])
        );
    }
}
console.log('Сущности успешно добавлены.');

// 3. Обучение и сохранение модели
// Обучение - это асинхронный процесс
async function trainAndSaveModel() {
    console.log('Начинаем обучение NLP-модели...');
    await manager.train();
    console.log('Обучение завершено.');
    // Сохранение модели в файл позволяет не обучать её при каждом запуске
    manager.save('./model.nlp');
}

// 4. Функция для обработки текста
async function processText(text: string) {
    // manager.process может автоматически загрузить модель, если она была сохранена
    return await manager.process('ru', text);
}

// Пример использования
async function runExample() {
    await trainAndSaveModel();
    const testText = "Требуется опытный Senior+ Frontend разработчик со знанием React и TypeScript. Опыт с Node.js будет плюсом.";
    const result = await processText(testText);

    console.log('--- Результат обработки NLP ---');
    console.log(JSON.stringify(result.entities, null, 2));
}

// Запускаем пример
runExample();

export { processText, manager };

