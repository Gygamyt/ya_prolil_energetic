import { ExtractionResult, ExtractorContext, SimpleExtractor } from './base-extractor';

export interface Location {
    regions: string[];
    workType: 'Remote' | 'Office' | 'Hybrid' | 'N/A';
    isGlobal: boolean;
}

export class LocationExtractor extends SimpleExtractor {
    private static readonly REGION_MAP: Record<string, string> = {
        'рф': 'RU', 'россия': 'RU', 'russia': 'RU',
        'рб': 'BY', 'беларусь': 'BY', 'belarus': 'BY',
        'eu': 'EU', 'европа': 'EU', 'europe': 'EU',
        'us': 'US', 'сша': 'US', 'usa': 'US',
        'армения': 'AM', 'armenia': 'AM',
        'грузия': 'GE', 'georgia': 'GE',
    };
    fieldName = 'location';

    constructor() {
        super(0.9);
    }

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        if (!context?.numberedList) {
            return this.createResult(null, 0, "regex");
        }

        const locationText = context.numberedList[24];

        if (!locationText || !locationText.trim()) {
            return this.createResult(null, 0, 'regex');
        }

        const lowerCaseText = locationText.toLowerCase();

        const location: Location = {
            regions: [],
            workType: this.extractWorkType(lowerCaseText),
            isGlobal: lowerCaseText.includes('no restrictions'),
        };

        if (lowerCaseText.includes('дружественные страны')) {
            location.regions = ['RU'];
        }

        else if (!location.isGlobal) {
            const regionsFound = new Set<string>();
            for (const [alias, code] of Object.entries(LocationExtractor.REGION_MAP)) {
                if (lowerCaseText.includes(alias)) {
                    regionsFound.add(code);
                }
            }
            location.regions = Array.from(regionsFound);
        }

        const confidence = location.regions.length > 0 || location.isGlobal ? 0.95 : 0.5;

        return this.createResult(location, confidence, 'regex');
    }

    validate(value: any): boolean {
        return value && typeof value === 'object' && Array.isArray(value.regions);
    }

    private extractWorkType(text: string): 'Remote' | 'Office' | 'Hybrid' | 'N/A' {
        if (text.includes('remote') || text.includes('удален')) return 'Remote';
        if (text.includes('office') || text.includes('офис')) return 'Office';
        if (text.includes('hybrid') || text.includes('гибрид')) return 'Hybrid';
        if (text.includes('no restrictions')) return 'Remote'
        return 'N/A';
    }
}
