// @ts-ignore
import { NlpManager } from 'node-nlp';
import { nlpEntities } from "./data";

const manager = new NlpManager({
    languages: ['ru', 'en'],
    forceNER: true
});

console.log('Загрузка кастомных NLP-сущностей...');
for (const entity of nlpEntities) {
    for (const option of entity.options) {
        manager.addNamedEntityText(
            entity.name,
            option.name,
            entity.languages,
            option.synonyms
        );
    }
}
console.log('Сущности успешно добавлены.');

async function trainAndSaveModel() {
    console.log('Начинаем обучение NLP-модели...');
    await manager.train();
    console.log('Обучение завершено.');
    manager.save('./model.nlp');
}

async function processText(text: string) {
    return await manager.process('ru', text);
}

async function runExample() {
    await trainAndSaveModel();
    const testText = "Требуется опытный Senior+ Frontend разработчик со знанием React и TypeScript. Опыт с Node.js будет плюсом.";
    const result = await processText(testText);

    console.log('--- Результат обработки NLP ---');
    console.log(JSON.stringify(result.entities, null, 2));
}

runExample();

export { processText, manager };
