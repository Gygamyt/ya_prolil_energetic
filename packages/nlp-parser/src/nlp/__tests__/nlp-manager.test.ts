import { describe, it, expect, beforeAll } from 'vitest';
import { manager, processText } from '../nlp-manager';


describe('NLP Manager', () => {
    beforeAll(async () => {
        await manager.train();
    }, 30000);

    it('should extract a single technology entity from a sentence', async () => {
        const text = 'Требуется опытный разработчик на React.';
        const result = await processText(text);

        expect(result.entities).toHaveLength(1);

        const entity = result.entities[0];
        expect(entity.entity).toBe('technology');
        expect(entity.option).toBe('React');
        expect(entity.sourceText).toBe('react');
    });

    it('should extract multiple entities of different types (role and technology)', async () => {
        const text = 'Ищем Automation QA со знанием JavaScript и Docker.';
        const result = await processText(text);

        expect(result.entities).toHaveLength(3);

        expect(result.entities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ entity: 'role', option: 'Automation QA' }),
                expect.objectContaining({ entity: 'technology', option: 'JavaScript' }),
                expect.objectContaining({ entity: 'technology', option: 'Docker' }),
            ])
        );
    });

    it('should be case-insensitive and extract entities written in lower/upper case', async () => {
        const text = 'Знание python и опыт с DOCKER обязательны.';
        const result = await processText(text);

        expect(result.entities).toHaveLength(2);
        expect(result.entities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ entity: 'technology', option: 'Python' }),
                expect.objectContaining({ entity: 'technology', option: 'Docker' }),
            ])
        );
    });

    it('should return an empty array when no known entities are present', async () => {
        const text = 'Мы ищем активного и целеустремленного сотрудника в наш дружный коллектив.';
        const result = await processText(text);

        expect(result.entities).toHaveLength(0);
    });

    it('should extract skills and platforms', async () => {
        const text = 'Нужен опыт в CI/CD и разработке под Android.';
        const result = await processText(text);

        expect(result.entities).toHaveLength(2);
        expect(result.entities).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ entity: 'skill', option: 'CI/CD' }),
                expect.objectContaining({ entity: 'platform', option: 'Android' }),
            ])
        );
    });
});
