import { ExtractionResult, ExtractorContext, SimpleExtractor } from './base-extractor';

export class RequestedHeadcountExtractor extends SimpleExtractor {
    fieldName = 'requestedHeadcount';

    constructor() {
        super(0.9);
    }

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        if (!context?.numberedList) {
            return this.createResult(null, 0, "regex");
        }

        const headcountText = context.numberedList[12];

        if (!headcountText || !headcountText.trim()) {
            return this.createResult(null, 0, 'regex');
        }

        const match = headcountText.match(/\d+/);

        if (match && match[0]) {
            const headcount = parseInt(match[0], 10);
            return this.createResult(headcount, 0.95, 'regex');
        }

        return this.createResult(null, 0, 'regex');
    }

    validate(value: any): boolean {
        return typeof value === 'number';
    }
}
