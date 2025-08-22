import { ExtractionResult, ExtractorContext, SimpleExtractor } from './base-extractor';
import { LanguageRequirement, LanguageLevel, SupportedLanguage } from '../types';

/**
 * Extracts language requirements from a structured numbered list.
 */
export class LanguageExtractor extends SimpleExtractor {
    fieldName = 'languageRequirements';

    constructor() {
        super(0.9);
    }

    private static readonly LANGUAGE_MAP: Record<string, SupportedLanguage> = {
        'английский': 'English', 'english': 'English', 'англ': 'English',
        'русский': 'Russian', 'russian': 'Russian',
        'испанский': 'Spanish', 'spanish': 'Spanish',
        'немецкий': 'German', 'german': 'German',
        'французский': 'French', 'french': 'French',
        'польский': 'Polish', 'polish': 'Polish',
        'украинский': 'Ukrainian', 'ukrainian': 'Ukrainian',
        'чешский': 'Czech', 'czech': 'Czech',
        'португальский': 'Portuguese', 'portuguese': 'Portuguese',
        'итальянский': 'Italian', 'italian': 'Italian',
        'голландский': 'Dutch', 'dutch': 'Dutch',
    };

    private static readonly LEVEL_MAP: Record<string, LanguageLevel> = {
        'a1': 'A1', 'beginner': 'A1', 'начальный': 'A1',
        'a2': 'A2', 'elementary': 'A2', 'базовый': 'A2',
        'b1': 'B1', 'intermediate': 'B1', 'средний': 'B1',
        'b2': 'B2', 'upper-intermediate': 'B2', 'upper intermediate': 'B2', 'выше среднего': 'B2',
        'c1': 'C1', 'advanced': 'C1', 'продвинутый': 'C1',
        'c2': 'C2', 'proficient': 'C2', 'свободное владение': 'C2',
        'native': 'Native', 'носитель': 'Native'
    };

    private static readonly SORTED_LANGUAGE_ALIASES = Object.entries(LanguageExtractor.LANGUAGE_MAP)
        .sort((a, b) => b[0].length - a[0].length);

    private static readonly SORTED_LEVEL_ALIASES = Object.entries(LanguageExtractor.LEVEL_MAP)
        .sort((a, b) => b[0].length - a[0].length);

    private getNumField(obj: Record<any, string>, num: number): string | undefined {
        return obj[num] ?? obj[num.toString()];
    }

    async extract(text: string, context?: ExtractorContext): Promise<ExtractionResult> {
        const requirements: LanguageRequirement[] = [];
        if (!context?.numberedList) {
            return this.createResult([], 0, "regex");
        }

        const numberedList = context.numberedList;

        const englishText = this.getNumField(numberedList, 8);
        if (typeof englishText === 'string' && !this.isEmptyValue(englishText)) {
            const requirement = this.parseLevelAndModifier(englishText, 'English', 'required');
            if (requirement) {
                requirements.push(requirement);
            }
        }

        const additionalLangText = this.getNumField(numberedList, 10);
        if (typeof additionalLangText === 'string' && !this.isEmptyValue(additionalLangText)) {
            const langInfo = this.findLanguageInText(additionalLangText);
            if (langInfo) {
                const { language, foundAlias } = langInfo;
                const levelTextCandidate = this.getNumField(numberedList, 11);
                const levelText = levelTextCandidate || additionalLangText.replace(new RegExp(foundAlias, 'i'), '');
                const requirement = this.parseLevelAndModifier(levelText, language, 'preferred');
                if (requirement) {
                    requirements.push(requirement);
                }
            }
        }

        return this.createResult(requirements, requirements.length > 0 ? 0.95 : 0, 'regex');
    }

    private parseLevelAndModifier(text: string, language: SupportedLanguage, priority: 'required' | 'preferred'): LanguageRequirement | null {
        const modifierMatch = text.match(/([+-])/);
        const modifier = modifierMatch ? (modifierMatch[1] as '+' | '-') : undefined;

        const normalizedText = text.toLowerCase().replace(/[\s,()-]/g, '');
        if (!normalizedText) return null;

        const level = this.findValue(normalizedText, LanguageExtractor.SORTED_LEVEL_ALIASES);
        if (!level) return null;

        return { language, level, modifier, priority };
    }

    private findLanguageInText(text: string): { language: SupportedLanguage, foundAlias: string } | undefined {
        const normalizedText = text.toLowerCase();
        for (const [alias, language] of LanguageExtractor.SORTED_LANGUAGE_ALIASES) {
            if (normalizedText.includes(alias.toLowerCase())) {
                return { language, foundAlias: alias };
            }
        }
        return undefined;
    }

    private findValue<T>(text: string, sortedAliases: [string, T][]): T | undefined {
        for (const [alias, value] of sortedAliases) {
            const normalizedAlias = alias.toLowerCase().replace(/[\s,()-]/g, '');
            if (text.includes(normalizedAlias)) {
                return value;
            }
        }
        return undefined;
    }

    private isEmptyValue(value: string): boolean {
        const emptyMarkers = ['n/a', 'na', 'нет', 'не требуется', 'none'];
        return emptyMarkers.some(marker => value.toLowerCase().trim().includes(marker));
    }

    validate(value: any): boolean {
        return Array.isArray(value) && value.every(req =>
            req.language && req.level && req.priority
        );
    }
}
