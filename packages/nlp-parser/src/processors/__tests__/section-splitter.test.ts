
import { describe, it, expect } from 'vitest';
import { SectionSplitter } from '../section-splitter';

describe('SectionSplitter', () => {
    const sampleRequest = `CV - QA - Automation QA - Insider - tmura - R-12793
https://innowisegroup2.my.salesforce.com/lightning/r/RequestPosition__c/a05e2000001S3yVAAS/view

Описание

1. Индустрия проекта FinTech
2. Домен Testing
4. Ожидаемая загрузка 1
6. Уровень разработчиков Senior
7. Требуемый уровень для клиента 3-5 years
8. Min уровень английского языка B2`;

    describe('split', () => {
        it('should extract meta information', () => {
            const result = SectionSplitter.split(sampleRequest);

            expect(result.metaInfo).toContain('CV - QA - Automation QA');
            expect(result.metaInfo).toContain('salesforce.com');
        });

        it('should parse numbered list items', () => {
            const result = SectionSplitter.split(sampleRequest);

            expect(result.numberedList[1]).toBe('Индустрия проекта FinTech');
            expect(result.numberedList[2]).toBe('Домен Testing');
            expect(result.numberedList[4]).toBe('Ожидаемая загрузка 1');
            expect(result.numberedList[6]).toBe('Уровень разработчиков Senior');
        });

        it('should identify missing items', () => {
            const result = SectionSplitter.split(sampleRequest);
            const missing = SectionSplitter.getMissingItems(result.numberedList);

            expect(missing).toContain(3);
            expect(missing).toContain(5);
        });

        it('should fill missing items with N/A', () => {
            const numberedList = { 1: 'Item 1', 3: 'Item 3', 5: 'Item 5' };
            const filled = SectionSplitter.fillMissingItems(numberedList);

            expect(filled[2]).toBe('N/A');
            expect(filled[4]).toBe('N/A');
            expect(filled[1]).toBe('Item 1');
            expect(filled[3]).toBe('Item 3');
        });
    });
});
