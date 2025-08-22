import { ParseInput, ParseResult } from '../types';
import { BaseStrategy } from './base-strategy';
import { MetaInfoExtractor } from '../extractors/meta-info-extractor';
import { MissingDataHandler } from '../extractors/missing-data-handler';
import { DeveloperGradeExtractor } from "../extractors/developer-grade-extractor";

/**
 * Strategy focused on parsing numbered list items
 */
export class StructuredListStrategy extends BaseStrategy {
    name = 'flexible' as const;

    constructor() {
        super([
            new MetaInfoExtractor(),
            new DeveloperGradeExtractor(),
            new MissingDataHandler()
        ]);
        this.minOverallConfidence = 0.3;
    }

    async parse(input: ParseInput): Promise<ParseResult> {
        try {
            const { normalizedText, sections } = this.preprocessText(input.data);

            // Focus on numbered list parsing
            const context = this.createContext(normalizedText, sections);

            // Run extractors
            const { data, fieldConfidences, extractedFields } = await this.runExtractors(
                normalizedText,
                context
            );

            // Extract from numbered list items
            const listData = this.extractFromNumberedList(sections.numberedList);

            // Merge data
            const mergedData = { ...data, ...listData };
            const finalData = this.applyDefaults(mergedData);

            // Calculate confidence based on list coverage
            const listConfidence = this.calculateListConfidence(sections.numberedList);
            const totalConfidences = { ...fieldConfidences, listCoverage: listConfidence };

            return this.createParseResult(
                finalData,
                totalConfidences,
                [...extractedFields, 'numberedList'],
                this.name,
                listConfidence > 0.2
            );

        } catch (error) {
            return this.createParseResult(
                {},
                {},
                [],
                this.name,
                false,
                error instanceof Error ? error.message : 'Structured list parsing error'
            );
        }
    }

    /**
     * Extract data from numbered list items
     */
    private extractFromNumberedList(numberedList: Record<number, string>): any {
        const data: any = {};

        // Map numbered items to fields
        const itemMapping: Record<number, { field: string, processor?: (value: string) => any }> = {
            1: { field: 'industry' },
            2: { field: 'domain' },
            4: { field: 'expectedLoad', processor: (v) => this.parseNumber(v) },
            // 6: { field: 'levels', processor: (v) => this.parseLevel(v) },
            7: { field: 'requiredLevel' },
            8: { field: 'minEnglishLevel', processor: (v) => this.parseLanguageLevel(v) },
            12: { field: 'teamSize', processor: (v) => this.parseNumber(v) },
            13: { field: 'workingHours' },
            14: { field: 'responsibilities' },
            15: { field: 'technologies', processor: (v) => this.parseTechnologies(v) },
            17: { field: 'collaborationDuration' },
            20: { field: 'deadline', processor: (v) => this.parseDate(v) },
            22: { field: 'salesManager' },
            24: { field: 'location', processor: (v) => this.parseLocation(v) },
            27: { field: 'status', processor: (v) => this.parseStatus(v) },
            31: { field: 'coordinator' },
            33: { field: 'primaryRequestDetails' },
            34: { field: 'salesManagerSummary' },
            35: { field: 'vendorExperience' }
        };

        // Extract each mapped item
        for (const [itemNum, config] of Object.entries(itemMapping)) {
            const num = parseInt(itemNum);
            const value = numberedList[num];

            if (value && value !== 'N/A' && value.trim() !== '') {
                const processedValue = config.processor ? config.processor(value) : value;
                data[config.field] = processedValue;
            }
        }

        return data;
    }

    /**
     * Parse numeric values
     */
    private parseNumber(value: string): number {
        const match = value.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * Parse language level
     */
    private parseLanguageLevel(value: string): string {
        const levelMatch = value.match(/\b([ABC][12]|Native|Intermediate|Advanced|Elementary)\b/i);
        return levelMatch ? levelMatch[3] : value;
    }

    /**
     * Parse technologies list
     */
    private parseTechnologies(value: string): string[] {
        // Simple tech extraction - can be enhanced
        const techs = value.split(/[,;]/).map(t => t.trim()).filter(t => t.length > 0);
        return techs.length > 0 ? techs : [value];
    }

    /**
     * Parse date values
     */
    private parseDate(value: string): Date | undefined {
        const dateMatch = value.match(/\d{4}-\d{2}-\d{2}/) || value.match(/\d{2}[.\/]\d{2}[.\/]\d{4}/);
        if (dateMatch) {
            try {
                return new Date(dateMatch[0]);
            } catch {
                return undefined;
            }
        }
        return undefined;
    }

    /**
     * Parse location information
     */
    private parseLocation(value: string): any {
        return {
            regions: this.extractRegions(value),
            workType: this.extractWorkType(value),
            additionalRequirements: value
        };
    }

    /**
     * Parse project status
     */
    private parseStatus(value: string): string {
        const statusMap: Record<string, string> = {
            'new': 'pending',
            'новый': 'pending',
            'ongoing': 'processing',
            'в работе': 'processing',
            'completed': 'completed',
            'завершен': 'completed'
        };

        const lowerValue = value.toLowerCase();
        for (const [key, status] of Object.entries(statusMap)) {
            if (lowerValue.includes(key)) {
                return status;
            }
        }

        return 'pending';
    }

    /**
     * Calculate confidence based on list item coverage
     */
    private calculateListConfidence(numberedList: Record<number, string>): number {
        const expectedItems = [1, 2, 4, 6, 7, 8, 12, 14, 15, 17, 20, 22, 24, 27, 31];
        const foundItems = expectedItems.filter(num => {
            const value = numberedList[num];
            return value && value !== 'N/A' && value.trim() !== '';
        });

        return foundItems.length / expectedItems.length;
    }

    // Reuse helper methods from RegexStrategy
    private extractRegions(locationText: string): string[] {
        const regions: string[] = [];
        const regionPatterns = [
            /\bРФ\b/gi, /\bРБ\b/gi, /\bEU\b/gi, /\bUS\b/gi
        ];

        regionPatterns.forEach(pattern => {
            if (pattern.test(locationText)) {
                const match = locationText.match(pattern);
                if (match) regions.push(match[0].toUpperCase());
            }
        });

        return [...new Set(regions)];
    }

    private extractWorkType(locationText: string): 'Remote' | 'Office' | 'Hybrid' {
        const text = locationText.toLowerCase();
        if (text.includes('remote') || text.includes('удален')) return 'Remote';
        if (text.includes('office') || text.includes('офис')) return 'Office';
        if (text.includes('hybrid') || text.includes('гибрид')) return 'Hybrid';
        return 'Remote';
    }
}
