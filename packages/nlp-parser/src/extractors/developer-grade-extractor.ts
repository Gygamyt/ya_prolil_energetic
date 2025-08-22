import { ExtractionResult, ExtractorContext, SimpleExtractor } from './base-extractor';

/**
 * Extracts developer grade(s) and specific roles from text.
 * - FINAL CORRECTED version with stateful parsing.
 * - Handles roles: SDET, TestOps.
 * - Handles modifiers: +, ++, -, -- correctly attached to the preceding grade.
 * - Enforces modifier rules: Only Junior, Middle, Senior can have modifiers.
 * - English language ONLY. No Cyrillic.
 */
export class DeveloperGradeExtractor extends SimpleExtractor {
    fieldName = 'levels';

    constructor() {
        super(0.95);
    }

    private static readonly MODIFIABLE_GRADES = new Set(['Junior', 'Middle', 'Senior']);

    private static readonly GRADE_ALIASES: Record<string, string> = {
        'jun': 'Junior', 'junior': 'Junior',
        'mid': 'Middle', 'middle': 'Middle',
        'sen': 'Senior', 'senior': 'Senior',
        'lead': 'Lead',
        'architect': 'Architect', 'arch': 'Architect',
        'principal': 'Principal', 'expert': 'Principal',
        'strong': 'Senior',
        'sdet': 'SDET',
        'testops': 'TestOps'
    };

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        const gradeText = context?.numberedList?.[6] || text;
        const tokens = this.extractTokens(gradeText);
        const finalGrades: string[] = [];

        for (const token of tokens) {
            const canonicalGrade = DeveloperGradeExtractor.GRADE_ALIASES[token];

            if (canonicalGrade) {
                finalGrades.push(canonicalGrade);
            } else if (/^([+\-]){1,2}$/.test(token)) {
                if (finalGrades.length > 0) {
                    const lastGradeIndex = finalGrades.length - 1;
                    const lastGradeBase = finalGrades[lastGradeIndex].replace(/([+\-])/g, '');
                    if (DeveloperGradeExtractor.MODIFIABLE_GRADES.has(lastGradeBase)) {
                        finalGrades[lastGradeIndex] += token;
                    }
                }
            }
        }

        return this.createResult(
            [...new Set(finalGrades)],
            finalGrades.length > 0 ? 0.99 : 0.4,
            'regex',
            gradeText,
            { original: gradeText, extracted: finalGrades }
        );
    }

    private extractTokens(text: string): string[] {
        if (!text) return [];

        return text
            .toLowerCase()
            .replace(/([+\-]){1,2}/g, ' $& ')
            .replace(/[,;/–—]/g, ' ')
            .replace(/[^a-z0-9+\- ]/g, '')
            .trim()
            .split(/\s+/)
            .filter(token => token.length > 0);
    }

    validate(value: any): boolean {
        return Array.isArray(value) && value.every(v => typeof v === 'string');
    }
}
