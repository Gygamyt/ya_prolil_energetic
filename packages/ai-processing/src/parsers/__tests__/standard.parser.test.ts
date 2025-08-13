import { describe, it, expect, beforeEach } from 'vitest';
import { StandardParser } from '../standard.parser';
import type { ParseConfig } from '../../types/request.types';
import { SALESFORCE_TEST_REQUESTS } from "./test-data";

const mockConfig: ParseConfig = {
    aiProvider: 'gemini',
    confidenceThreshold: 0.6,
    fallbackStrategy: 'flexible',
    enableCaching: true
};

describe('StandardParser', () => {
    let parser: StandardParser;

    beforeEach(() => {
        parser = new StandardParser(mockConfig);
    });

    it('should create parser instance', () => {
        expect(parser).toBeDefined();
        expect(parser).toBeInstanceOf(StandardParser);
    });

    it('should handle empty string gracefully', async () => {
        const result = await parser.parse('');

        expect(result.success).toBe(false);
        expect(result.confidence).toBeLessThan(0.6);
        expect(result.strategy).toBe('standard');
        expect(result.extractedFields).toEqual([]);
        expect(result.data?.rawInput).toBe('');
        expect(result.data?.teamSize).toBeUndefined();
        expect(result.data?.experience).toBeUndefined();
    });

    it('should parse single field - developer level', async () => {
        const singleFieldRequest = `6. Уровень разработчиков Senior`.trim();

        const result = await parser.parse(singleFieldRequest);

        expect(result.strategy).toBe('standard');
        expect(result.data?.levels).toEqual(['Senior']);
        expect(result.extractedFields).toContain('levels');
        expect(result.data?.rawInput).toBe(singleFieldRequest);
        expect(result.data?.parseStrategy).toBe('standard');
        expect(result.data?.status).toBe('pending');
        expect(result.data?.createdAt).toBeInstanceOf(Date);
    });

    it('should parse two fields - level and team size', async () => {
        const twoFieldsRequest = `
6. Уровень разработчиков
Middle
12. Запрошенное количество сотрудников
3
    `.trim();

        const result = await parser.parse(twoFieldsRequest);

        expect(result.strategy).toBe('standard');
        expect(result.data?.levels).toEqual(['Middle']);
        expect(result.data?.teamSize).toBe(3);
        expect(result.extractedFields).toContain('levels');
        expect(result.extractedFields).toContain('teamSize');
        expect(result.extractedFields).toHaveLength(2);
        expect(result.confidence).toBeGreaterThan(0.3); // Должен быть выше из-за структурированности
    });

    it('should parse three fields - level, team size and language', async () => {
        const threeFieldsRequest = `
6. Уровень разработчиков
Senior
8. Min уровень английского языка
B2
12. Запрошенное количество сотрудников
2
  `.trim();

        const result = await parser.parse(threeFieldsRequest);

        expect(result.strategy).toBe('standard');
        expect(result.data?.levels).toEqual(['Senior']);
        expect(result.data?.teamSize).toBe(2);
        expect(result.data?.languageRequirements).toBeDefined();
        expect(result.data?.languageRequirements).toHaveLength(1);
        expect(result.data?.languageRequirements?.[0]).toMatchObject({
            language: 'English',
            level: 'B2',
            priority: 'required'
        });

        expect(result.extractedFields).toContain('levels');
        expect(result.extractedFields).toContain('teamSize');
        expect(result.extractedFields).toContain('languageRequirements');
        expect(result.extractedFields).toHaveLength(3);
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.success).toBe(true);
    });

    it('should parse fields with metadata - industry and sales manager', async () => {
        const requestWithMetadata = `
1. Индустрия проекта
Information Technologies
6. Уровень разработчиков
Middle+
12. Запрошенное количество сотрудников
1
22. Сейлс менеджер
Dzmitry Kastsiuk
  `.trim();

        const result = await parser.parse(requestWithMetadata);

        expect(result.strategy).toBe('standard');
        expect(result.data?.levels).toEqual(['Middle+']);
        expect(result.data?.teamSize).toBe(1);
        expect(result.data?.industry).toBe('Information Technologies');
        expect(result.data?.salesManager).toBe('Dzmitry Kastsiuk');

        expect(result.extractedFields).toContain('levels');
        expect(result.extractedFields).toContain('teamSize');
        expect(result.extractedFields).toContain('industry');
        expect(result.extractedFields).toContain('salesManager');
        expect(result.extractedFields).toHaveLength(4);
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.success).toBe(true);
    });

    it('should parse complex language requirements with modifiers', async () => {
        const complexLanguageRequest = `
6. Уровень разработчиков
Senior
8. Min уровень английского языка
B2+ English required, Spanish C1 preferred
12. Запрошенное количество сотрудников
1
  `.trim();

        const result = await parser.parse(complexLanguageRequest);

        expect(result.strategy).toBe('standard');
        expect(result.data?.levels).toEqual(['Senior']);
        expect(result.data?.teamSize).toBe(1);

        expect(result.data?.languageRequirements).toBeDefined();
        expect(result.data?.languageRequirements).toHaveLength(2);

        expect(result.data?.languageRequirements?.[0]).toMatchObject({
            language: 'English',
            level: 'B2',
            modifier: '+',
            priority: 'required'
        });

        expect(result.data?.languageRequirements?.[1]).toMatchObject({
            language: 'Spanish',
            level: 'C1',
            priority: 'preferred'
        });

        expect(result.extractedFields).toContain('levels');
        expect(result.extractedFields).toContain('teamSize');
        expect(result.extractedFields).toContain('languageRequirements');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.success).toBe(true);
    });

    it('should parse location with timezone and work type', async () => {
        const locationRequest = `
6. Уровень разработчиков
Senior
12. Запрошенное количество сотрудников
1
24. Требуемая локация специалиста (-ов)
Remote (EST time zone alignment until 11 am Central)
  `.trim();

        const result = await parser.parse(locationRequest);

        expect(result.strategy).toBe('standard');
        expect(result.data?.levels).toEqual(['Senior']);
        expect(result.data?.teamSize).toBe(1);

        expect(result.data?.location).toBeDefined();
        expect(result.data?.location?.workType).toBe('Remote');
        expect(result.data?.location?.timezone).toBe('EST');
        expect(result.data?.location?.additionalRequirements).toContain('until 11 am Central');

        expect(result.extractedFields).toContain('levels');
        expect(result.extractedFields).toContain('teamSize');
        expect(result.extractedFields).toContain('location');
        expect(result.confidence).toBeGreaterThan(0.7);
        expect(result.success).toBe(true);
    });

    it('should parse experience and leadership requirements', async () => {
        const experienceRequest = `
6. Уровень разработчиков
Senior
12. Запрошенное количество сотрудников
1
14. Подробные требования к разработчику
Lead QA Engineer with 8+ years of experience and 3+ years in leadership role.
Main Responsibilities:
- Lead team of 5+ QA engineers
- Establish testing processes and mentoring
33. Первичный запрос
We need a strong leader with 10+ years total experience.
  `.trim();

        const result = await parser.parse(experienceRequest);

        // 🔍 DEBUG
        console.log('Experience result:', result.data?.experience);

        expect(result.strategy).toBe('standard');
        expect(result.data?.levels).toEqual(['Senior']);
        expect(result.data?.teamSize).toBe(1);
        expect(result.data?.role).toContain('Lead QA');

        expect(result.data?.experience).toBeDefined();
        expect(result.data?.experience?.minTotalYears).toBe(10);
        expect(result.data?.experience?.leadershipRequired).toBe(true);
        expect(result.data?.experience?.leadershipYears).toBe(3);

        expect(result.extractedFields).toContain('experience');
        expect(result.extractedFields).toContain('role');
        expect(result.success).toBe(true);
    });

    it('should parse complete complex Salesforce request', async () => {
        const fullRequest = `
CV - QA - - Iglu Tech - nvany - R-12652

1. Индустрия проекта
Information Technologies
6. Уровень разработчиков
middle+;Senior
8. Min уровень английского языка
B2+ English required, Spanish C1 preferred
12. Запрошенное количество сотрудников
2
14. Подробные требования к разработчику
Senior QA Engineer / Lead QA automation engineer with 8+ years of experience and 3+ years in leadership role.
Main Responsibilities:
- Establish QA processes from ground up
- Lead team of 5+ engineers  
- Design automation frameworks with TypeScript, Playwright
Must have: Node.js, TypeScript, Playwright
Nice to have: CodeceptJS, ArtilleryIO
20. Срок отправки заказчику
2025-08-15
22. Сейлс менеджер
Dzmitry Kastsiuk
24. Требуемая локация специалиста (-ов)
EU Remote (CET timezone alignment)
31. Проектный координатор
Kseniya Hanzha
33. Первичный запрос
We need 2 experienced QA automation engineers with 10+ years total experience.
Strong leadership skills required for establishing QA function.
  `.trim();

        const result = await parser.parse(fullRequest);

        console.log('Full request confidence:', result.confidence);
        console.log('Full request extracted fields:', result.extractedFields);

        expect(result.success).toBe(true);
        expect(result.strategy).toBe('standard');
        expect(result.confidence).toBeGreaterThan(0.8); // Высокий confidence для полного запроса

        expect(result.data?.levels).toEqual(['Middle+', 'Senior']);
        expect(result.data?.teamSize).toBe(2);

        expect(result.data?.languageRequirements).toHaveLength(2);
        expect(result.data?.languageRequirements?.[0]).toMatchObject({
            language: 'English',
            level: 'B2',
            modifier: '+',
            priority: 'required'
        });
        expect(result.data?.languageRequirements?.[1]).toMatchObject({
            language: 'Spanish',
            level: 'C1',
            priority: 'preferred'
        });

        expect(result.data?.location).toMatchObject({
            regions: ['EU'],
            workType: 'Remote',
            timezone: 'CET'
        });

        expect(result.data?.experience?.minTotalYears).toBe(10);
        expect(result.data?.experience?.leadershipRequired).toBe(true);
        expect(result.data?.experience?.leadershipYears).toBe(3);
        expect(result.data?.experience?.roleExperience).toBeDefined();

        expect(result.data?.industry).toBe('Information Technologies');
        expect(result.data?.salesManager).toBe('Dzmitry Kastsiuk');
        expect(result.data?.coordinator).toBe('Kseniya Hanzha');
        expect(result.data?.deadline).toEqual(new Date('2025-08-15'));

        expect(result.data?.role).toContain('Senior QA');
        expect(result.data?.responsibilities).toContain('Lead team');
        expect(result.data?.responsibilities).toContain('TypeScript');
        expect(result.data?.responsibilities).toContain('Playwright');

        const expectedFields = [
            'levels', 'teamSize', 'languageRequirements', 'location',
            'experience', 'industry', 'salesManager', 'coordinator',
            'deadline', 'role', 'responsibilities'
        ];

        expectedFields.forEach(field => {
            expect(result.extractedFields).toContain(field);
        });

        expect(result.extractedFields.length).toBeGreaterThanOrEqual(10);
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle malformed data gracefully', async () => {
            const malformedRequest = `
6. Уровень разработчиков
UnknownLevel;InvalidLevel
8. Min уровень английского языка
Z9+ SomeRandomLanguage
12. Запрошенное количество сотрудников
NotANumber
20. Срок отправки заказчику
InvalidDate
  `.trim();

            const result = await parser.parse(malformedRequest);

            expect(result.strategy).toBe('standard');
            expect(result.success).toBe(false);
            expect(result.confidence).toBeLessThan(0.6);

            if (result.data?.levels !== undefined) {
                expect(result.data.levels).toEqual([]);
            } else {
                expect(result.data?.levels).toBeUndefined();
            }

            expect(result.data?.teamSize).toBeUndefined();
            expect(result.data?.deadline).toBeUndefined();

            if (result.data?.languageRequirements !== undefined) {
                expect(result.data.languageRequirements).toEqual([]);
            } else {
                expect(result.data?.languageRequirements).toBeUndefined();
            }

            expect(result.error).toBeUndefined();
        });

        it('should handle unstructured text with low confidence', async () => {
            const unstructuredText = `
Hello, we are looking for a senior QA engineer with good English skills.
The candidate should have experience in test automation and be able to work remotely.
We need someone with 5+ years of experience in software testing.
The position is for our European office and requires knowledge of JavaScript.
Please send us resumes of suitable candidates as soon as possible.
    `.trim();

            const result = await parser.parse(unstructuredText);

            console.log('Unstructured text extracted fields:', result.extractedFields);

            expect(result.strategy).toBe('standard');
            expect(result.success).toBe(false);
            expect(result.confidence).toBeLessThan(0.4);

            expect(result.extractedFields.length).toBeLessThanOrEqual(1);

            expect(result.data?.rawInput).toBe(unstructuredText);
            expect(result.data?.parseStrategy).toBe('standard');
            expect(result.data?.status).toBe('pending');
        });

        it('should extract valid fields from partially correct data', async () => {
            const partiallyCorrectRequest = `
Some random text before...

6. Уровень разработчиков
Senior
Invalid field here
8. Min уровень английского языка
B2
More random text...
12. Запрошенное количество сотрудников
3
    `.trim();

            const result = await parser.parse(partiallyCorrectRequest);

            expect(result.strategy).toBe('standard');
            expect(result.success).toBe(true);
            expect(result.confidence).toBeGreaterThan(0.6);

            expect(result.data?.levels).toEqual(['Senior']);
            expect(result.data?.teamSize).toBe(3);
            expect(result.data?.languageRequirements).toHaveLength(1);
            expect(result.data?.languageRequirements?.[0].level).toBe('B2');

            expect(result.extractedFields).toContain('levels');
            expect(result.extractedFields).toContain('teamSize');
            expect(result.extractedFields).toContain('languageRequirements');
        });
    });

    it('should handle all test data samples correctly', async () => {
        const testResults = [];

        for (const [key, request] of Object.entries(SALESFORCE_TEST_REQUESTS)) {
            const result = await parser.parse(request);

            testResults.push({
                key,
                success: result.success,
                confidence: result.confidence,
                fieldsCount: result.extractedFields.length,
                hasError: !!result.error
            });
        }

        const successfulTests = testResults.filter(r => r.success);
        const failedTests = testResults.filter(r => !r.success);

        expect(successfulTests.length).toBeGreaterThanOrEqual(6);

        const expectedFailures = ['empty', 'malformed', 'unstructured', 'singleField'];
        const unexpectedFailures = failedTests.filter(r => !expectedFailures.includes(r.key));
        expect(unexpectedFailures).toHaveLength(0);

        expect(testResults.every(r => !r.hasError)).toBe(true);

        testResults.forEach(result => {
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(result.fieldsCount).toBeGreaterThanOrEqual(0);
        });

        const twoFieldsResult = testResults.find(r => r.key === 'twoFields');
        expect(twoFieldsResult?.success).toBe(true);
        expect(twoFieldsResult?.fieldsCount).toBe(2);

        const threeFieldsResult = testResults.find(r => r.key === 'threeFields');
        expect(threeFieldsResult?.success).toBe(true);
        expect(threeFieldsResult?.fieldsCount).toBe(3);

        const emptyResult = testResults.find(r => r.key === 'empty');
        expect(emptyResult?.fieldsCount).toBe(0);
        expect(emptyResult?.success).toBe(false);
    });
});
