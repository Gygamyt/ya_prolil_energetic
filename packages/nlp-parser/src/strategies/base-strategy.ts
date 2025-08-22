import { ParseInput, ParseResult, ParseStrategy, ClientRequest } from '../types';
import { FieldExtractor, ExtractionResult, ExtractorContext } from '../extractors/base-extractor';
import { ConfidenceEvaluator } from '../core/confidence-evaluator';
import { SectionSplitter, SplitResult, TextNormalizer } from "../processors";

/**
 * Base strategy class for all parsing approaches
 */
export abstract class BaseStrategy {
    abstract name: ParseStrategy;
    protected extractors: Map<string, FieldExtractor> = new Map();
    protected minOverallConfidence: number = 0.3;

    protected constructor(extractors: FieldExtractor[] = []) {
        extractors.forEach(extractor => {
            this.addExtractor(extractor);
        });
    }

    /**
     * Add field extractor
     */
    addExtractor(extractor: FieldExtractor): void {
        this.extractors.set(extractor.fieldName, extractor);
    }

    /**
     * Remove field extractor
     */
    removeExtractor(fieldName: string): void {
        this.extractors.delete(fieldName);
    }

    /**
     * Main parsing method - must be implemented by subclasses
     */
    abstract parse(input: ParseInput): Promise<ParseResult>;

    /**
     * Preprocess input text
     */
    protected preprocessText(text: string): { normalizedText: string; sections: SplitResult } {
        const normalizedText = TextNormalizer.normalize(text);
        const sections = SectionSplitter.split(normalizedText);

        return { normalizedText, sections };
    }

    /**
     * Create extractor context from preprocessed data
     */
    protected createContext(normalizedText: string, sections: SplitResult): ExtractorContext {
        return {
            metaInfo: sections.metaInfo,
            numberedList: sections.numberedList,
            rawText: normalizedText,
            patterns: {} // Will be filled by specific strategies
        };
    }

    /**
     * Run all extractors and collect results
     */
    protected async runExtractors(
        text: string,
        context: ExtractorContext
    ): Promise<{
        data: Partial<ClientRequest>,
        fieldConfidences: Record<string, number>,
        extractedFields: string[]
    }> {
        const data: Partial<ClientRequest> = {};
        const fieldConfidences: Record<string, number> = {};
        const extractedFields: string[] = [];

        for (const [fieldName, extractor] of this.extractors) {
            try {
                const result = await extractor.extract(text, context);

                if (result.confidence > 0 && extractor.validate(result.value)) {
                    const mappedData = this.mapExtractorResult(fieldName, result);

                    Object.assign(data, mappedData);

                    fieldConfidences[fieldName] = result.confidence;
                    extractedFields.push(fieldName);
                }
            } catch (error) {
                console.warn(`Extractor ${fieldName} failed:`, error);
                fieldConfidences[fieldName] = 0;
            }
        }

        return { data, fieldConfidences, extractedFields };
    }


    /**
     * Map extractor result to ClientRequest structure
     */
    protected mapExtractorResult(fieldName: string, result: ExtractionResult): Partial<ClientRequest> {
        const mapped: Partial<ClientRequest> = {};

        switch (fieldName) {
            case 'metaInfo':
                if (result.value && typeof result.value === 'object') {
                    // Extract meta information (department-level role)
                    if (result.value.role) {
                        mapped.role = result.value.role; // Short role (QA, Backend, etc.)
                        // Store for potential enhancement later
                        (mapped as any).metaRole = result.value.role;
                    }
                    if (result.value.requestId) mapped.id = result.value.requestId;
                    if (result.value.technology) {
                        // Technology from meta can be useful
                        (mapped as any).metaTechnology = result.value.technology;
                    }
                    if (result.value.company) {
                        (mapped as any).metaCompany = result.value.company;
                    }
                    if (result.value.manager) {
                        // If no sales manager found elsewhere, use meta manager
                        if (!mapped.salesManager) {
                            mapped.salesManager = result.value.manager;
                        }
                    }
                    if (result.value.dates && result.value.dates.length > 0) {
                        const latestDate = result.value.dates[result.value.dates.length - 1];
                        try {
                            mapped.deadline = new Date(latestDate);
                        } catch {
                            // Ignore invalid dates
                        }
                    }
                    if (result.source) {
                        mapped.rawInput = result.source;
                    }
                }
                break;

            case 'missingData':
                // Missing data handler fills in N/A values
                break;

            default:
                (mapped as any)[fieldName] = result.value;
                break;
        }

        return mapped;
    }

    /**
     * Create final parse result
     */
    protected createParseResult(
        data: Partial<ClientRequest>,
        fieldConfidences: Record<string, number>,
        extractedFields: string[],
        strategy: ParseStrategy,
        success: boolean = true,
        error?: string
    ): ParseResult {
        const confidence = ConfidenceEvaluator.aggregate(fieldConfidences);

        return {
            success,
            data,
            error,
            confidence,
            strategy,
            extractedFields
        };
    }

    /**
     * Apply default values for missing fields
     */
    protected applyDefaults(data: Partial<ClientRequest>): Partial<ClientRequest> {
        const defaults: Partial<ClientRequest> = {
            parseStrategy: this.name,
            parseConfidence: 0,
            status: 'pending',
            createdAt: new Date(),
            levels: [],
            languageRequirements: [],
            teamSize: 0,
            location: {
                workType: 'Remote'
            },
            experience: {
                leadershipRequired: false
            },
            skills: {
                required: [],
                preferred: []
            },
            responsibilities: 'N/A'
        };

        return { ...defaults, ...data };
    }

    /**
     * Check if result meets minimum quality threshold
     */
    protected meetsQualityThreshold(confidence: number): boolean {
        return confidence >= this.minOverallConfidence;
    }
}
