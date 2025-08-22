import { ParseInput, ParseResult } from '../types';
import { BaseStrategy } from './base-strategy';
import { DeveloperGradeExtractor, LanguageExtractor, LocationExtractor, MetaInfoExtractor, MissingDataHandler, RequestedHeadcountExtractor } from "../extractors";
import { PatternMatcher } from "../processors";
import { PrimaryRequirementsNLPExtractor } from "../extractors/primary-requirements-nlp-extractor";

/**
 * Regex-based parsing strategy focusing on structured patterns
 */
export class RegexStrategy extends BaseStrategy {
    name = 'standard' as const;

    constructor() {
        super([
            new MetaInfoExtractor(),
            new DeveloperGradeExtractor(),
            new MissingDataHandler(),
            new LanguageExtractor(),
            new LocationExtractor(),
            new RequestedHeadcountExtractor(),

            new PrimaryRequirementsNLPExtractor()
        ]);
        this.minOverallConfidence = 0.4;
    }

    async parse(input: ParseInput): Promise<ParseResult> {
        try {
            const { normalizedText, sections } = this.preprocessText(input.data);

            const patterns = PatternMatcher.findAll(normalizedText);

            const context = {
                ...this.createContext(normalizedText, sections),
                patterns
            };

            const { data, fieldConfidences, extractedFields } = await this.runExtractors(
                normalizedText,
                context
            );

            const enhancedData = this.enhanceWithPatterns(data, patterns, sections);

            const finalData = this.applyDefaults(enhancedData);

            const confidence = fieldConfidences.metaInfo || 0;

            return this.createParseResult(
                finalData,
                fieldConfidences,
                extractedFields,
                this.name,
                this.meetsQualityThreshold(confidence)
            );

        } catch (error) {
            return this.createParseResult(
                {},
                {},
                [],
                this.name,
                false,
                error instanceof Error ? error.message : 'Unknown regex parsing error'
            );
        }
    }

    /**
     * Enhance data with pattern matching results
     */
    private enhanceWithPatterns(
        data: any,
        patterns: Record<string, any>,
        sections: any
    ): any {
        const enhanced = { ...data };

        if (patterns.teamSize && patterns.teamSize.length > 0) {
            enhanced.teamSize = parseInt(patterns.teamSize[0].value) || 1;
        } else if (sections.numberedList[1]) {
            const teamSizeMatch = sections.numberedList[12].match(/(\d+)/);
            if (teamSizeMatch) {
                enhanced.teamSize = parseInt(teamSizeMatch[1]);
            }
        }

        if (sections.numberedList[22]) {
            const salesManagerText = sections.numberedList[22];
            const cleanedManager = salesManagerText
                .replace(/^Сейлс менеджер\s*/i, '')
                .replace(/^Sales manager\s*/i, '')
                .replace(/N\/A/gi, 'N/A')
                .trim();

            enhanced.salesManager = cleanedManager || 'N/A';
        }


        if (sections.numberedList[31]) {
            const coordinatorText = sections.numberedList[31];
            const cleanedCoordinator = coordinatorText
                .replace(/^Проектный координатор\s*/i, '')
                .replace(/^Project coordinator\s*/i, '')
                .replace(/N\/A/gi, 'N/A')
                .trim();
            enhanced.coordinator = cleanedCoordinator || 'N/A';
        }

        return enhanced;
    }

    /**
     * Clean field value by removing common prefixes
     */
    private cleanFieldValue(value: string, fieldPrefixes: string[]): string {
        let cleaned = value;

        for (const prefix of fieldPrefixes) {
            const regex = new RegExp(`^${prefix}\\s*`, 'i');
            cleaned = cleaned.replace(regex, '');
        }

        return cleaned.replace(/N\/A/gi, 'N/A').trim() || 'N/A';
    }
}
