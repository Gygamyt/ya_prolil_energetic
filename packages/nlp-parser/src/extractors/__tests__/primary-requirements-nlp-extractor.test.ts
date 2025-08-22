// src/extractors/__tests__/primary-requirements-nlp-extractor.test.ts

import { describe, it, expect, beforeAll } from 'vitest';
import { ExtractorContext } from '../base-extractor';
import { manager } from '../../nlp/nlp-manager';
import { PrimaryRequirements, PrimaryRequirementsNLPExtractor } from "../primary-requirements-nlp-extractor";

/**
 * Тестовый набор для PrimaryRequirementsNLPExtractor.
 * Проверяет извлечение сущностей из текстового поля с требованиями.
 */
describe('PrimaryRequirementsNLPExtractor', () => {

    /**
     * Обучаем NLP-модель один раз перед запуском всех тестов в этом файле.
     * Это значительно ускоряет выполнение, так как самая долгая операция
     * выполняется только единожды.
     */
    beforeAll(async () => {
        await manager.train();
    }, 60000);

    /**
     * Тестовый текст, основанный на реальных данных.
     * Содержит сущности из разных категорий для комплексной проверки.
     */
    const realRequirementsText = `
    Обязательные требования: ОПЫТ РАБОТЫ В ФИНТЕХЕ; Знание теоретических основ тестирования программного обеспечения; 
    Понимание принципов функционирования протокола HTTP и особенностей архитектуры REST; 
    Представление о принципах асинхронного обмена сообщениями с использованием очередей (Message Queues, MQ); 
    Базовые навыки работы с языком запросов SQL; Основы объектно-ориентированного программирования (ООП); 
    Опыт работы с инструментами для отправки и проверки HTTP-запросов (Postman, Swagger).
    Дополнительные требования: Знание и понимание микросервисной архитектуры приложения;
    Описание проекта и команды: Проект для крупного банка. Работают в Agile процессах.
    Технологический стек: Java, Spring Boot, ActiveMQ Artemis, Kafka, PostgreSQL.
  `;

    /**
     * Основной тест "счастливого пути".
     * Проверяет, что экстрактор корректно находит и извлекает сущности
     * в виде простых массивов строк.
     */
    it('should extract entities as flat string arrays from a real text sample', async () => {
        const extractor = new PrimaryRequirementsNLPExtractor();
        const context: ExtractorContext = {
            numberedList: { 14: realRequirementsText }
        };

        const result = await extractor.extract('', context);
        const value = result.value as PrimaryRequirements;

        expect(value).not.toBeNull();

        expect(value.technologies).toEqual(expect.arrayContaining([
            'Java',
            'Spring Boot',
            'Kafka',
            'PostgreSQL',
            'Postman',
            'Swagger',
            'ActiveMQ Artemis'
        ]));

        expect(value.domains).toEqual(expect.arrayContaining([
            'Fintech',
            'Banking'
        ]));

        expect(value.skills).toEqual(expect.arrayContaining([
            'Agile',
            'REST API',
            'SQL',
            'OOP',
            'Message Queues',
            'Microservices',
            'HTTP'
        ]));

        expect(value.roles).toHaveLength(0);
    });

    /**
     * Тестируем крайние случаи: пустой ввод или нерелевантные маркеры.
     * Экстрактор должен вернуть null, не выбрасывая ошибок.
     */
    it('should return a null result for empty or non-applicable input', async () => {
        const extractor = new PrimaryRequirementsNLPExtractor();

        const contextEmpty: ExtractorContext = { numberedList: { 14: '' } };
        const resultEmpty = await extractor.extract('', contextEmpty);
        expect(resultEmpty.value).toBeNull();

        const contextNA: ExtractorContext = { numberedList: { 14: 'N/A' } };
        const resultNA = await extractor.extract('', contextNA);
        expect(resultNA.value).toBeNull();
    });

    /**
     * Тестируем случай, когда текст есть, но в нем нет ни одной известной нам сущности.
     * Это гарантирует, что экстрактор не найдет ложных совпадений.
     */
    it('should return a null result when text contains no known entities', async () => {
        const extractor = new PrimaryRequirementsNLPExtractor();
        const textWithNoEntities = 'Ищем хорошего человека в дружный коллектив для интересных задач.';
        const context: ExtractorContext = { numberedList: { 14: textWithNoEntities } };

        const result = await extractor.extract('', context);
        expect(result.value).toBeNull();
    });
});
