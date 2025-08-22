import { ConfidenceEvaluator } from '../core/confidence-evaluator';

/**
 * Extraction result for a single field
 */
export interface ExtractionResult {
    value: any;
    confidence: number;
    method: 'regex' | 'nlp' | 'hybrid' | 'pattern';
    source?: string;
    metadata?: Record<string, any>;
}

/**
 * Base interface for all field extractors
 */
export interface FieldExtractor {
    fieldName: string;
    extract(text: string, context?: ExtractorContext): Promise<ExtractionResult>;
    validate(value: any): boolean;
}

/**
 * Context for extraction (from processors)
 */
export interface ExtractorContext {
    metaInfo?: string;
    numberedList?: Record<number, string>;
    rawText?: string;
    patterns?: Record<string, any>;
}

/**
 * Base extractor class with common functionality
 */
export abstract class BaseExtractor implements FieldExtractor {
    abstract fieldName: string;

    constructor(
        protected minConfidence: number = 0.5,
        protected enabled: boolean = true
    ) {}

    /**
     * Main extraction method - must be implemented by subclasses
     */
    abstract extract(text: string, context?: ExtractorContext): Promise<ExtractionResult>;

    /**
     * Validate extracted value - can be overridden
     */
    validate(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'string') return value.trim() !== '';
        return true;
    }

    /**
     * Create extraction result with standardized format
     */
    protected createResult(
        value: any,
        confidence: number,
        method: ExtractionResult['method'],
        source?: string,
        metadata?: Record<string, any>
    ): ExtractionResult {
        const roundedConfidence = Math.round(Math.min(Math.max(confidence, 0), 1) * 100) / 100;

        return {
            value: this.normalizeValue(value),
            confidence: roundedConfidence,
            method,
            source,
            metadata
        };
    }


    /**
     * Normalize extracted value
     */
    protected normalizeValue(value: any): any {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            return trimmed === '' ? null : trimmed;
        }
        return value;
    }

    /**
     * Find value in numbered list by item numbers
     */
    protected findInNumberedList(
        numberedList: Record<number, string>,
        itemNumbers: number[]
    ): string | null {
        for (const num of itemNumbers) {
            const value = numberedList[num];
            if (value && value !== 'N/A') {
                return value;
            }
        }
        return null;
    }

    /**
     * Search for patterns in text with fallback confidence
     */
    protected searchPattern(
        text: string,
        patterns: RegExp[],
        baseConfidence: number = 0.8
    ): ExtractionResult {
        for (let i = 0; i < patterns.length; i++) {
            const pattern = patterns[i];
            const match = text.match(pattern);

            if (match) {
                const confidence = baseConfidence - (i * 0.1);
                return this.createResult(
                    match[1] || match,
                    confidence,
                    'regex',
                    match[0]
                );
            }
        }

        return this.createResult(null, 0, 'regex');
    }

    /**
     * Extract from specific numbered list items
     */
    protected async extractFromList(
        numberedList: Record<number, string>,
        itemNumbers: number[],
        additionalProcessing?: (value: string) => any
    ): Promise<ExtractionResult> {
        const value = this.findInNumberedList(numberedList, itemNumbers);

        if (!value) {
            return this.createResult(null, 0, 'pattern');
        }

        const processedValue = additionalProcessing ? additionalProcessing(value) : value;
        const confidence = ConfidenceEvaluator.evaluateField(processedValue, 'pattern');

        return this.createResult(processedValue, confidence, 'pattern', value);
    }

    /**
     * Combine multiple extraction attempts
     */
    protected combineResults(...results: ExtractionResult[]): ExtractionResult {
        const validResults = results.filter(r => r.confidence > 0);

        if (validResults.length === 0) {
            return this.createResult(null, 0, 'hybrid');
        }

        validResults.sort((a, b) => b.confidence - a.confidence);
        const best = validResults[0];

        if (validResults.length > 1 && validResults[1].confidence > 0.7) {
            const boostedConfidence = best.confidence + 0.1;
            const roundedConfidence = Math.round(Math.min(boostedConfidence, 1.0) * 100) / 100;

            return {
                ...best,
                confidence: roundedConfidence,
                method: 'hybrid'
            };
        }

        return best;
    }
}

/**
 * Simple extractor for single-value fields
 */
export abstract class SimpleExtractor extends BaseExtractor {
    /**
     * Simple extraction from numbered list items
     */
    protected async extractSimple(
        context: ExtractorContext,
        itemNumbers: number[],
        patterns?: RegExp[]
    ): Promise<ExtractionResult> {
        if (!context.numberedList) {
            return this.createResult(null, 0, 'pattern');
        }

        const listResult = await this.extractFromList(context.numberedList, itemNumbers);

        if (listResult.confidence > 0.5) {
            return listResult;
        }

        if (patterns && context.rawText) {
            const patternResult = this.searchPattern(context.rawText, patterns);
            return this.combineResults(listResult, patternResult);
        }

        return listResult;
    }
}

/**
 * Complex extractor for multi-value or contextual fields
 */
export abstract class ComplexExtractor extends BaseExtractor {
    /**
     * Multi-step extraction with context analysis
     */
    protected async extractComplex(
        context: ExtractorContext,
        primaryItems: number[],
        secondaryItems: number[] = [],
        customLogic?: (text: string) => ExtractionResult
    ): Promise<ExtractionResult> {
        const results: ExtractionResult[] = [];

        if (context.numberedList) {
            const primaryResult = await this.extractFromList(context.numberedList, primaryItems);
            if (primaryResult.confidence > 0) {
                results.push(primaryResult);
            }

            if (primaryResult.confidence < 0.5 && secondaryItems.length > 0) {
                const secondaryResult = await this.extractFromList(context.numberedList, secondaryItems);
                if (secondaryResult.confidence > 0) {
                    results.push(secondaryResult);
                }
            }
        }

        if (customLogic && context.rawText) {
            const customResult = customLogic(context.rawText);
            if (customResult.confidence > 0) {
                results.push(customResult);
            }
        }

        return results.length > 0
            ? this.combineResults(...results)
            : this.createResult(null, 0, 'hybrid');
    }
}
