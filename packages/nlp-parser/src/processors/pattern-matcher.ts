/**
 * Pattern matcher: finds common patterns in text
 */
export interface PatternMatch {
    pattern: string;
    value: string;
    confidence: number;
    position?: number;
}

export class PatternMatcher {
    /**
     * Common regex patterns for Salesforce requests
     */
    private static readonly PATTERNS = {
        // Dates
        date: /\b(\d{4}-\d{2}-\d{2})\b/g,
        dateRu: /\b(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})\b/g,

        // URLs
        salesforceUrl: /(https:\/\/[^\/]*salesforce\.com\S*)/g,

        // IDs and codes
        requestId: /\b(R-\d{4,6})\b/g,
        opportunityId: /\b(\d{6}e\d{7}[A-Z0-9]+)\b/g,
        cvId: /\b(\d{6})\b/g,

        // Levels
        level: /\b(Junior|Middle|Senior|Lead|Principal)\b/gi,
        levelRu: /\b(джуниор|мидл|сеньор|лид|principal)\b/gi,

        // Languages with levels
        englishLevel: /английск\S*\s*\S*\s*\b([ABC][12]|Native|Intermediate|Advanced|Elementary)\b/gi,
        languageLevel: /\b([ABC][12]|Native|Intermediate|Advanced|Elementary)\b/gi,

        // Numbers and quantities
        teamSize: /(\d+)\s*(человек|сотрудник|специалист|people|persons?)/gi,
        yearsExperience: /(\d+)[+]?\s*(год|лет|years?)/gi,

        // Geographic locations
        location: /\b(РФ|РБ|EU|US|Remote|Office|Hybrid|Удален|Офис)\b/gi,
        timezone: /\b([A-Z]{3,4})\s*(время|timezone)/gi,
    };

    /**
     * Find all patterns in text
     */
    static findAll(text: string): Record<string, PatternMatch[]> {
        const results: Record<string, PatternMatch[]> = {};

        for (const [patternName, regex] of Object.entries(this.PATTERNS)) {
            const matches: PatternMatch[] = [];
            let match;

            regex.lastIndex = 0;

            while ((match = regex.exec(text)) !== null) {
                matches.push({
                    pattern: patternName,
                    value: match[1],
                    confidence: this.getPatternConfidence(patternName),
                    position: match.index
                });
            }

            if (matches.length > 0) {
                results[patternName] = matches;
            }
        }

        return results;
    }

    /**
     * Find specific pattern type
     */
    static find(text: string, patternName: keyof typeof PatternMatcher.PATTERNS): PatternMatch[] {
        const pattern = this.PATTERNS[patternName];
        if (!pattern) return [];

        const matches: PatternMatch[] = [];
        let match;

        pattern.lastIndex = 0;

        while ((match = pattern.exec(text)) !== null) {
            matches.push({
                pattern: patternName,
                value: match[1] || match[0],
                confidence: this.getPatternConfidence(patternName),
                position: match.index
            });
        }

        return matches;
    }

    /**
     * Get confidence score for pattern type
     */
    private static getPatternConfidence(patternName: string): number {
        const confidenceMap: Record<string, number> = {
            date: 0.95,
            salesforceUrl: 0.99,
            requestId: 0.95,
            opportunityId: 0.90,
            level: 0.85,
            englishLevel: 0.90,
            email: 0.95,
            cvId: 0.80,
            teamSize: 0.75,
            yearsExperience: 0.70,
            location: 0.85,
            timezone: 0.80
        };

        return confidenceMap[patternName] || 0.70;
    }

    /**
     * Extract meta information from CV line
     */
    static extractMetaInfo(cvLine: string): Record<string, string> {
        const meta: Record<string, string> = {};

        const normalized = cvLine.replace(/\s+/g, ' ').trim();

        let cvMatch = normalized.match(/^CV\s*-\s*([^-]*)\s*-\s*([^-]*)\s*-\s*([^-]*)\s*-\s*([^-]*)\s*-\s*(.*)$/);

        if (cvMatch) {
            meta.role = cvMatch[1].trim();
            meta.technology = cvMatch[2].trim();
            meta.company = cvMatch[3].trim();
            meta.manager = cvMatch[4].trim();
            meta.requestId = cvMatch[5].trim();
        } else {
            cvMatch = normalized.match(/^CV\s*-\s*([^-]*)\s*-\s*([^-]*)\s*-\s*([^-]*)\s*-\s*([^-]*)\s*-\s*(.*)$/);

            if (cvMatch) {
                meta.company = cvMatch[1].trim();
                meta.manager = cvMatch[2].trim();
                meta.country = cvMatch[3].trim();
                meta.technology = cvMatch[4].trim();
                meta.requestId = cvMatch[5].trim();
            }
        }

        return meta;
    }

    /**
     * Extract all dates from text (both ISO and Russian formats)
     */
    static extractDates(text: string): string[] {
        const dates: string[] = [];

        const isoDates = this.find(text, 'date');
        dates.push(...isoDates.map(m => m.value));

        const ruDates = this.find(text, 'dateRu');
        dates.push(...ruDates.map(m => m.value));

        return dates;
    }
}
