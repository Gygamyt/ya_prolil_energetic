import { ParseInput, ParseResult, ParseStrategy } from "../types";
import { StrategyManager } from "./strategy-manager";
import { FieldNormalizer } from "./field-normalizer";

/**
 * Base interface for parsing strategies
 */
export interface ParserStrategy {
    name: ParseStrategy;
    parse(input: ParseInput): Promise<ParseResult>;
}

/**
 * Interface for field extractors if needed separately
 */
export interface FieldExtractor {
    field: string;
    extract(text: string): { value: any; confidence: number };
}

/**
 * Main parser engine: orchestrates parsing strategies and extractors
 */
export class ParserEngine {
    private strategyManager: StrategyManager;
    private extractors: FieldExtractor[];

    constructor() {
        this.strategyManager = new StrategyManager();
        this.extractors = [];
    }

    /**
     * Register parsing strategy
     */
    registerStrategy(strategy: ParserStrategy): void {
        this.strategyManager.register(strategy);
    }

    /**
     * Add field extractor
     */
    addExtractor(extractor: FieldExtractor): void {
        this.extractors.push(extractor);
    }

    /**
     * Main parsing method
     */
    async parse(input: ParseInput): Promise<ParseResult> {
        const strategy = input.parseStrategy || "standard";

        try {
            // Get primary strategy
            const parserStrategy = this.strategyManager.get(strategy);
            if (!parserStrategy) {
                throw new Error(`Strategy "${strategy}" not found`);
            }

            // Execute parsing
            const result = await parserStrategy.parse(input);

            // If confidence is too low, try fallback
            if (result.confidence < 0.5) {
                const fallbackStrategy = this.strategyManager.getFallback(strategy);
                if (fallbackStrategy && fallbackStrategy.name !== strategy) {
                    const fallbackInput = { ...input, parseStrategy: fallbackStrategy.name };
                    const fallbackResult = await fallbackStrategy.parse(fallbackInput);

                    // Use better result
                    if (fallbackResult.confidence > result.confidence) {
                        return this.finalizeResult(fallbackResult, fallbackStrategy.name);
                    }
                }
            }

            return this.finalizeResult(result, strategy);

        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown parsing error",
                confidence: 0,
                strategy,
                extractedFields: []
            };
        }
    }

    /**
     * Finalize parsing result with normalization
     */
    private finalizeResult(result: ParseResult, strategy: ParseStrategy): ParseResult {
        const normalizedData = result.data
            ? FieldNormalizer.normalizeResult(result.data)
            : undefined;

        return {
            ...result,
            data: normalizedData,
            strategy
        };
    }
}
