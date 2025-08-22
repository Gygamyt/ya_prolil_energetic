import { describe, it, expect, beforeEach } from 'vitest';
import { MetaInfoExtractor } from '../meta-info-extractor';

describe('MetaInfoExtractor', () => {
    let extractor: MetaInfoExtractor;

    beforeEach(() => {
        extractor = new MetaInfoExtractor();
    });

    const sampleText = `CV - QA Engineer - Playwright - Company - manager - R-12793
https://innowisegroup2.my.salesforce.com/lightning/r/RequestPosition__c/a05e2000001S3yVAAS/view
Contact: test@company.com
Deadline: 2025-08-14
CV ID: 021972`;

    const sampleContext = {
        metaInfo: 'CV - QA Engineer - Playwright - Company - manager - R-12793',
        rawText: sampleText
    };

    describe('extract', () => {
        it('should extract meta information with high confidence', async () => {
            const result = await extractor.extract(sampleText, sampleContext);

            expect(result.confidence).toBeGreaterThan(0.9);
            expect(result.value.role).toBe('QA Engineer');
            expect(result.value.technology).toBe('Playwright');
            expect(result.value.company).toBe('Company');
            expect(result.value.manager).toBe('manager');
            expect(result.value.requestId).toBe('R-12793');
        });

        it('should extract URLs and patterns', async () => {
            const result = await extractor.extract(sampleText, sampleContext);

            expect(result.value.salesforceUrl).toContain('salesforce.com');
            // expect(result.value.emails).toContain('test@company.com');
            expect(result.value.dates).toContain('2025-08-14');
            expect(result.value.cvId).toBe('021972');
        });

        it('should handle missing meta info gracefully', async () => {
            const result = await extractor.extract(sampleText);

            expect(result.confidence).toBeGreaterThan(0.5); // Still extracts patterns
            expect(result.value.salesforceUrl).toBeDefined();
            expect(result.value.role).toBeUndefined(); // No CV line parsing
        });
    });

    describe('validate', () => {
        it('should validate object with properties', () => {
            expect(extractor.validate({ role: 'QA' })).toBe(true);
            expect(extractor.validate({})).toBe(false);
            expect(extractor.validate(null)).toBe(false);
            expect(extractor.validate('string')).toBe(false);
        });
    });
});
