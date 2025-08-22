import { ExtractionResult, ExtractorContext, SimpleExtractor } from './base-extractor';
import { PatternMatcher } from '../processors';

/**
 * Extracts meta information from CV line and URLs
 */
export class MetaInfoExtractor extends SimpleExtractor {
    fieldName = 'metaInfo';

    constructor() {
        super(0.9);
    }

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        const metaInfo: Record<string, any> = {};
        let totalConfidence = 0;
        let foundItems = 0;

        if (context?.metaInfo) {
            const lines = context.metaInfo.split('\n').filter(line => line.trim());

            const cvLines = lines.filter(line => line.trim().startsWith('CV -'));

            cvLines.forEach((cvLine, index) => {
                const cvData = PatternMatcher.extractMetaInfo(cvLine.trim());

                if (index === 0) {
                    Object.assign(metaInfo, cvData);
                } else {
                    if (cvData.role && !metaInfo.role) metaInfo.role = cvData.role;
                    if (cvData.technology) {
                        metaInfo.additionalTechnologies = cvData.technology.split(';').map(t => t.trim());
                    }
                    if (cvData.requestId && !metaInfo.requestId) metaInfo.requestId = cvData.requestId;

                    metaInfo[`cvLine${index + 1}`] = cvData;
                }
            });
        }

        const patterns = PatternMatcher.findAll(text);

        if (patterns.requestId && patterns.requestId.length > 0) {
            metaInfo.requestId = patterns.requestId[0].value;
            totalConfidence += patterns.requestId[0].confidence;
            foundItems++;
        }

        if (patterns.salesforceUrl && patterns.salesforceUrl.length > 0) {
            metaInfo.salesforceUrl = patterns.salesforceUrl[0].value;
            totalConfidence += patterns.salesforceUrl[0].confidence;
            foundItems++;
        }

        if (patterns.cvId && patterns.cvId.length > 0) {
            metaInfo.cvId = patterns.cvId[0].value;
            totalConfidence += patterns.cvId[0].confidence;
            foundItems++;
        }

        const dates = PatternMatcher.extractDates(text);
        if (dates.length > 0) {
            metaInfo.dates = dates;
            totalConfidence += 0.9;
            foundItems++;
        }

        const finalConfidence = foundItems > 0 ? totalConfidence / foundItems : 0;

        return this.createResult(
            metaInfo,
            finalConfidence,
            'pattern',
            context?.metaInfo || 'Full text',
            { extractedPatterns: Object.keys(patterns) }
        );
    }

    validate(value: any): boolean {
        if (!value || typeof value !== 'object') {
            return false;
        }

        return Object.keys(value).length > 0;
    }
}
