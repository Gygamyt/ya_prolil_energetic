import { describe, it, expect, beforeEach } from 'vitest';
import { RegexStrategy } from '../regex-strategy';
import { ParseInput } from '../../types';

describe('RegexStrategy', () => {
    let strategy: RegexStrategy;

    beforeEach(() => {
        strategy = new RegexStrategy();
    });

    const sampleInput: ParseInput = {
        data: `CV - QA - Automation QA - Insider - tmura - R-12793
https://innowisegroup2.my.salesforce.com/lightning/r/RequestPosition__c/a05e2000001S3yVAAS/view

Описание

1. Индустрия проекта FinTech
2. Домен Testing
4. Ожидаемая загрузка 1
6. Уровень разработчиков Senior
12. Запрошенное количество сотрудников 2
14. Подробные требования к разработчику QA Engineer fullstack (Backend), senior
22. Сейлс менеджер Ivan Petrov
24. Требуемая локация специалиста РФ, Remote
31. Проектный координатор Maria Smith`,
        parseStrategy: 'standard'
    };

    describe('parse', () => {
        it('should parse successfully with meta info', async () => {
            const result = await strategy.parse(sampleInput);

            expect(result.success).toBe(true);
            expect(result.strategy).toBe('standard');
            expect(result.confidence).toBeGreaterThan(0.3);
            expect(result.extractedFields).toContain('metaInfo');
        });

        it('should extract meta information', async () => {
            const result = await strategy.parse(sampleInput);

            expect(result.data?.role).toBe('QA');
            expect(result.data?.id).toBe('R-12793');
        });

        it('should extract team size', async () => {
            const result = await strategy.parse(sampleInput);

            expect(result.data?.teamSize).toBe(2);
        });

        it('should extract sales manager', async () => {
            const strategy = new RegexStrategy();

            const result = await strategy.parse(sampleInput);

            expect(result.data?.salesManager).toBe('Ivan Petrov');
        });

        it('should extract coordinator', async () => {
            const result = await strategy.parse(sampleInput);

            expect(result.data?.coordinator).toBe('Maria Smith');
        });

        it('should extract location info', async () => {
            const result = await strategy.parse(sampleInput);

            expect(result.data?.location).toBeDefined();
            expect(Array.isArray(result.data?.location?.regions)).toBe(true);
            // @ts-ignore
            expect(result.data?.location?.regions.length).toBeGreaterThan(0);
            expect(result.data?.location?.regions).toContain('RU');
            expect(result.data?.location?.workType).toBe('Remote');
        });

        it('should apply default values', async () => {
            const result = await strategy.parse(sampleInput);

            expect(result.data?.parseStrategy).toBe('standard');
            expect(result.data?.status).toBe('pending');
            expect(result.data?.skills?.required).toEqual([]);
            expect(result.data?.languageRequirements).toEqual([]);
        });

        it('should extract meta information', async () => {
            const result = await strategy.parse(sampleInput);

            expect(result.success).toBe(true);
            expect(result.data?.role).toBe('QA');
            expect(result.data?.id).toBe('R-12793');
        });

        it('should extract meta department info', async () => {
            const result = await strategy.parse(sampleInput);
            expect(result.data?.role).toBe('QA');
            expect(result.data?.metaRole).toContain('QA');
        });
    });

    describe('Language Requirements Extraction', () => {
        const inputWithLanguages: ParseInput = {
            data: `CV - QA - Test - R-99999
8. Английский B2+
10. Польский
11. B1
12. Запрошенное количество сотрудников 1
`,
            parseStrategy: 'standard'
        };

        it('should extract both English and an additional language', async () => {
            const result = await strategy.parse(inputWithLanguages);
            expect(result.data?.languageRequirements).toBeDefined();
            expect(result.data?.languageRequirements).toHaveLength(2);
        });

        it('should correctly parse the required English level', async () => {
            const result = await strategy.parse(inputWithLanguages);
            expect(result.data?.languageRequirements).toContainEqual({
                language: 'English',
                level: 'B2',
                modifier: '+',
                priority: 'required'
            });
        });

        it('should correctly parse the preferred additional language', async () => {
            const result = await strategy.parse(inputWithLanguages);
            expect(result.data?.languageRequirements).toContainEqual({
                language: 'Polish',
                level: 'B1',
                modifier: undefined,
                priority: 'preferred'
            });
        });

        it('should return an empty array when no language info is provided', async () => {
            const result = await strategy.parse(sampleInput); // Используем старый инпут без языков
            expect(result.data?.languageRequirements).toEqual([]);
        });
    });
});
