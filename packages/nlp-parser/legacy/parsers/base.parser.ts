import { ParseResult, ClientRequest, ParseStrategy } from '../types';

/**
 * Abstract base class for all parser implementations.
 * Provides common functionality and utilities for data extraction and validation.
 */
export abstract class BaseParser {

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Main parsing method - must be implemented by all parser subclasses.
     * @param input - Raw text input to parse
     * @param options - Optional parsing configuration
     * @returns Promise resolving to ParseResult with extracted data
     */
    abstract parse(input: string, options?: { normalize?: boolean }): Promise<ParseResult>;


    /**
     * Returns the parsing strategy identifier for this parser.
     * @returns Strategy name (e.g., 'nlp', 'standard', 'hybrid')
     */
    protected abstract getStrategy(): ParseStrategy;

    // ═══════════════════════════════════════════════════════════════════════════════════
    // ERROR HANDLING & UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Common error handling for all parsers.
     * Logs error and returns standardized error response.
     * @param error - Error that occurred during parsing
     * @returns ParseResult with error information
     */
    protected handleError(error: any): ParseResult {
        console.error(`Parsing error in ${this.getStrategy()} parser:`, error);

        return {
            success: false,
            confidence: 0,
            strategy: this.getStrategy(),
            extractedFields: [],
            data: undefined,
            error: error?.message || 'Unknown parsing error occurred'
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // DATA ANALYSIS & VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Calculates confidence score based on the completeness of extracted fields.
     * Higher score indicates more successfully extracted important fields.
     * @param data - Partially filled ClientRequest object
     * @returns Confidence score between 0 and 1
     */
    protected calculateConfidence(data: Partial<ClientRequest>): number {
        if (!data) {
            return 0;
        }

        if (data.rawInput !== undefined && (!data.rawInput || data.rawInput.trim() === '')) {
            return 0;
        }

        const importantFields = [
            'role',
            'levels',
            'teamSize',
            'responsibilities',
            'salesManager',
            'coordinator',
            'industry'
        ];

        const filledFields = importantFields.filter(field => {
            const value = data[field as keyof ClientRequest];
            return value !== undefined && value !== null && value !== '' &&
                (!Array.isArray(value) || value.length > 0);
        });

        return Math.min(filledFields.length / importantFields.length, 1);
    }

    /**
     * Returns list of successfully extracted field names.
     * Excludes technical/metadata fields and empty values.
     * @param data - Partially filled ClientRequest object
     * @returns Array of field names that contain meaningful data
     */
    protected getExtractedFields(data: Partial<ClientRequest>): string[] {
        if (!data) {
            return [];
        }

        if (data.rawInput !== undefined && (!data.rawInput || data.rawInput.trim() === '')) {
            return [];
        }

        return Object.keys(data).filter(key => {
            const value = data[key as keyof ClientRequest];

            // Exclude technical/metadata fields
            if (['rawInput', 'parseStrategy', 'status', 'createdAt', 'parseConfidence', 'processedAt'].includes(key)) {
                return false;
            }

            // Filter out empty values
            return value !== undefined &&
                value !== null &&
                value !== '' &&
                (!Array.isArray(value) || value.length > 0);
        });
    }

    /**
     * Validates parsed data to ensure minimum requirements are met.
     * @param data - Partially filled ClientRequest object
     * @returns True if data meets minimum validation criteria
     */
    protected validateParsedData(data: Partial<ClientRequest>): boolean {
        return !!(data.role || data.responsibilities);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════
    // DATA STRUCTURE CREATION
    // ═══════════════════════════════════════════════════════════════════════════════════

    /**
     * Creates base ClientRequest structure with default values.
     * Provides foundation for all parsers to build upon.
     * @param rawInput - Original input text to store
     * @returns Partial ClientRequest with initialized default values
     */
    protected createBaseClientRequest(rawInput: string): Partial<ClientRequest> {
        return {
            rawInput,
            parseStrategy: this.getStrategy(),
            status: 'pending',
            createdAt: new Date(),
            parseConfidence: 0,
            levels: [],
            languageRequirements: [],
            skills: {
                required: [],
                preferred: [],
                leadership: []
            },
            experience: {
                leadershipRequired: false,
                roleExperience: []
            },
            location: {
                workType: undefined,
                regions: [],
                timezone: undefined
            }
        };
    }
}
