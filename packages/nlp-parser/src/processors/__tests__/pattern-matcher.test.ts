import { describe, it, expect } from 'vitest';
import { PatternMatcher } from '../pattern-matcher';

describe('PatternMatcher', () => {
    describe('findAll', () => {
        const sampleText = `CV - QA Engineer - Playwright - Company - manager - R-12793
https://innowisegroup2.my.salesforce.com/lightning/r/RequestPosition__c/a05e2000001S3yVAAS/view
Senior level required
английский B2 level
3+ years experience
Email: test@company.com
Deadline: 2025-08-14`;

        it('should find all pattern types', () => {
            const results = PatternMatcher.findAll(sampleText);

            expect(results.requestId).toBeDefined();
            expect(results.requestId[0].value).toBe('R-12793');

            expect(results.salesforceUrl).toBeDefined();
            expect(results.salesforceUrl[0].value).toContain('salesforce.com');

            expect(results.level).toBeDefined();
            expect(results.level[0].value).toBe('Senior');

            expect(results.date).toBeDefined();
            expect(results.date[0].value).toBe('2025-08-14');
        });
    });

    describe('extractMetaInfo', () => {
        it('should parse CV line correctly', () => {
            const cvLine = 'CV - QA Engineer - Playwright - Company - manager - R-12793';
            const meta = PatternMatcher.extractMetaInfo(cvLine);

            expect(meta.role).toBe('QA Engineer');
            expect(meta.technology).toBe('Playwright');
            expect(meta.company).toBe('Company');
            expect(meta.manager).toBe('manager');
            expect(meta.requestId).toBe('R-12793');
        });

        it('should handle malformed CV line', () => {
            const cvLine = 'Invalid CV line format';
            const meta = PatternMatcher.extractMetaInfo(cvLine);

            expect(Object.keys(meta)).toHaveLength(0);
        });
    });

    describe('find specific patterns', () => {
        it('should find English level patterns', () => {
            const text = 'английский B2 минимальный уровень, также английского C1';
            const matches = PatternMatcher.find(text, 'englishLevel');

            expect(matches).toHaveLength(2);
            expect(matches[0].value).toBe('B2');
            expect(matches[1].value).toBe('C1');
        });

        it('should find team size patterns', () => {
            const text = '5 сотрудников требуется, команда 3 человека';
            const matches = PatternMatcher.find(text, 'teamSize');

            expect(matches).toHaveLength(2);
            expect(matches[0].value).toBe('5');
            expect(matches[1].value).toBe('3');
        });
    });
});
