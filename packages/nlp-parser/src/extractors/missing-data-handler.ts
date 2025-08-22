import { BaseExtractor, ExtractionResult, ExtractorContext } from './base-extractor';

/**
 * Handles missing data and fills gaps with N/A
 */
export class MissingDataHandler extends BaseExtractor {
    fieldName = 'missingData';

    constructor() {
        super(0.0);
    }

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        if (!context?.numberedList) {
            return this.createResult({}, 1.0, 'pattern');
        }

        const missing: Record<string, any> = {};
        const numberedList = context.numberedList;

        const fieldMappings: Record<number, string> = {
            1: 'industry',
            2: 'domain',
            3: 'solutionType',
            4: 'expectedLoad',
            6: 'levels',
            7: 'requiredLevel',
            8: 'minEnglishLevel',
            10: 'additionalLanguage',
            11: 'minAdditionalLanguageLevel',
            12: 'teamSize',
            13: 'workingHours',
            14: 'detailedRequirements',
            15: 'technologies',
            17: 'collaborationDuration',
            20: 'clientDeadline',
            22: 'salesManager',
            23: 'regionalGroup',
            24: 'requiredLocation',
            27: 'projectStatus',
            31: 'projectCoordinator',
            33: 'primaryRequestDetails',
            34: 'salesManagerSummary',
            35: 'vendorExperience',
        };

        for (const [itemNum, fieldName] of Object.entries(fieldMappings)) {
            const num = parseInt(itemNum);
            const value = numberedList[num];

            if (!value || value.trim() === '' || this.isEmptyValue(value)) {
                missing[fieldName] = 'N/A';
            }
        }

        const existingNums = Object.keys(numberedList).map(Number);
        const expectedNums = Object.keys(fieldMappings).map(Number);

        for (const expectedNum of expectedNums) {
            if (!existingNums.includes(expectedNum)) {
                const fieldName = fieldMappings[expectedNum];
                missing[fieldName] = 'N/A';
            }
        }

        return this.createResult(
            missing,
            1.0,
            'pattern',
            'Numbered list analysis',
            {
                missingCount: Object.keys(missing).length,
                totalExpected: expectedNums.length
            }
        );
    }

    /**
     * Check if value should be considered empty
     */
    private isEmptyValue(value: string): boolean {
        const emptyValues = [
            'н/д', 'нет данных', 'отсутствует', 'нет',
            'no data', 'n/a', 'na', 'not available',
            '-', '--', '—', '–', '...', 'tbd', 'tbc'
        ];

        const normalized = value.toLowerCase().trim();
        return emptyValues.includes(normalized);
    }

    validate(value: any): boolean {
        return typeof value === 'object';
    }
}
