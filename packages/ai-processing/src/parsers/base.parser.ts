import { CacheConfig, CacheFactory, CacheProvider } from "@ai-management/cache/src";
import { CachedParseResult, LanguageLevel, LanguageRequirement, ParseConfig, ParseResult, SupportedLanguage } from "../types/request.types";
import crypto from 'crypto';
import { logger } from "@repo/logger/src";

export abstract class BaseParser {
    protected config: ParseConfig;
    private cacheProvider: CacheProvider | undefined;
    private static cacheInitialized = false;

    protected constructor(config: ParseConfig) {
        this.config = config;
        this.initializeCache();
    }

    private initializeCache(): void {
        if (!BaseParser.cacheInitialized) {
            const cacheConfig: CacheConfig = {
                provider: 'memory',
                ttl: 300,
                keyPrefix: 'parser:',
                maxSize: 1000,
                checkPeriod: 60
            };

            CacheFactory.create('parser', cacheConfig);
            BaseParser.cacheInitialized = true;
            logger.info(`🏭 Parser cache initialized: ${cacheConfig.provider}`);
        }

        this.cacheProvider = CacheFactory.get('parser')!;
    }

    private generateCacheKey(input: string): string {
        const configHash = crypto.createHash('md5')
            .update(JSON.stringify({
                parser: this.constructor.name, // StandardParser, FlexibleParser, etc.
                confidenceThreshold: this.config.confidenceThreshold,
                fallbackStrategy: this.config.fallbackStrategy,
                aiProvider: this.config.aiProvider
            }))
            .digest('hex')
            .substring(0, 8); // Первые 8 символов

        const inputHash = crypto.createHash('sha256')
            .update(input.trim()) // Убираем лишние пробелы для консистентности
            .digest('hex')
            .substring(0, 16); // Первые 16 символов

        const cacheKey = `${configHash}:${inputHash}`;
        console.log(`🔑 Generated cache key: ${cacheKey}`);

        return cacheKey;
    }

    async parseWithCache(input: string): Promise<CachedParseResult> {
        if (!this.config.enableCaching) {
            console.log('🔄 Cache disabled, parsing directly...');
            return this.parse(input);
        }

        const cacheKey = this.generateCacheKey(input);
        const startTime = Date.now();

        // Пробуем получить из кеша
        const cached = await this.cacheProvider!.get<ParseResult>(cacheKey);
        if (cached) {
            const cacheTime = Date.now() - startTime;
            console.log(`📦 Cache HIT in ${cacheTime}ms: ${cacheKey.substring(0, 12)}...`);

            return {
                ...cached,
                metadata: {
                    fromCache: true,
                    cacheHit: true,
                    cacheTime
                }
            };
        }

        // Если кеша нет - парсим
        console.log(`🔄 Cache MISS: ${cacheKey.substring(0, 12)}..., parsing...`);
        const parseStart = Date.now();
        const result = await this.parse(input);
        const parseTime = Date.now() - parseStart;

        // Кешируем результат
        await this.cacheProvider!.set(cacheKey, result);
        console.log(`💾 Cached result in ${Date.now() - startTime}ms`);

        return {
            ...result,
            metadata: {
                fromCache: false,
                cacheHit: false,
                parseTime,
                totalTime: Date.now() - startTime
            }
        };
    }

    static async clearParserCache(): Promise<void> {
        const cache = CacheFactory.get('parser');
        if (cache) {
            await cache.clear();
            logger.info('🗑️ Parser cache cleared globally');
        }
    }

    static async getParserCacheStats() {
        const cache = CacheFactory.get('parser');
        if (!cache) {
            return {
                error: 'Cache not initialized',
                available: false
            };
        }

        const stats = await cache.getStats();
        return {
            available: true,
            provider: 'memory',
            ...stats,
            efficiency: stats.hits && stats.misses ?
                Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0
        };
    }

    // 🔧 Инстанс методы для локального управления
    async invalidateCache(input?: string): Promise<void> {
        if (input) {
            // Инвалидируем конкретный ключ
            const cacheKey = this.generateCacheKey(input);
            await this.cacheProvider!.del(cacheKey);
            logger.info(`🗑️ Invalidated cache for key: ${cacheKey.substring(0, 12)}...`);
        } else {
            // Инвалидируем весь кеш
            await BaseParser.clearParserCache();
        }
    }

    abstract parse(input: string): Promise<ParseResult>;

    protected extractLevels(text: string): string[] {
        const levelPattern = /(junior|middle|senior|lead)\+?/gi;
        const matches = text.match(levelPattern) || [];
        return matches.map(level => this.normalizeLevel(level));
    }

    protected extractLanguageRequirements(text: string): LanguageRequirement[] {
        const languages: LanguageRequirement[] = [];

        const patterns = [
            /([ABC][12])([+-]?)\s*(English|Spanish|German|French|Polish|Russian|Ukrainian|Czech|Portuguese|Italian|Dutch)/gi,
            /(English|Spanish|German|French|Polish|Russian|Ukrainian|Czech|Portuguese|Italian|Dutch)\s*([ABC][12])([+-]?)/gi,
            /(Native|Fluent)\s*(English|Spanish|German|French|Polish|Russian|Ukrainian|Czech|Portuguese|Italian|Dutch)/gi
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const language = this.normalizeLanguage(match[3] || match[1]);
                const level = this.normalizeLanguageLevel(match[1] || match[2]);
                const modifier = this.extractModifier(match[2] || match[3]);

                if (language && level) {
                    languages.push({
                        language,
                        level,
                        modifier,
                        priority: this.determinePriority(text, language)
                    });
                }
            }
        });

        return this.deduplicateLanguages(languages);
    }

    protected extractExperienceYears(text: string): number | undefined {
        const yearPatterns = [
            /(\d+)\+?\s*years?\s*(?:total\s*)?experience/gi,
            /(\d+)\+?\s*years?\s*of\s*experience/gi,
            /(\d+)\+?\s*years?\s*experience/gi,
            /(\d+)\+?\s*years/gi
        ];

        const foundYears: number[] = [];

        yearPatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                foundYears.push(parseInt(match[1]));
            }
        });

        return foundYears.length > 0 ? Math.max(...foundYears) : undefined;
    }

    protected extractTeamSize(text: string): number {
        const sizePattern = /(\d+)\s*(?:people|persons?|specialists?|developers?)/i;
        const match = text.match(sizePattern);
        return match ? parseInt(match[1]) : 1;
    }

    private normalizeLevel(level: string): string {
        const normalized = level.toLowerCase();
        const hasPlus = normalized.includes('+');

        if (normalized.includes('junior')) return hasPlus ? 'Junior+' : 'Junior';
        if (normalized.includes('middle')) return hasPlus ? 'Middle+' : 'Middle';
        if (normalized.includes('senior')) return hasPlus ? 'Senior+' : 'Senior';
        if (normalized.includes('lead')) return 'Lead';

        return level;
    }

    protected normalizeLanguage(lang: string): SupportedLanguage | null {
        const normalized = lang.toLowerCase();
        const langMap: Record<string, SupportedLanguage> = {
            'english': 'English',
            'spanish': 'Spanish',
            'german': 'German',
            'french': 'French',
            'polish': 'Polish',
            'russian': 'Russian',
            'ukrainian': 'Ukrainian',
            'czech': 'Czech',
            'portuguese': 'Portuguese',
            'italian': 'Italian',
            'dutch': 'Dutch'
        };

        return langMap[normalized] || null;
    }

    protected normalizeLanguageLevel(level: string): LanguageLevel | null {
        const normalized = level.toUpperCase();
        if (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(normalized)) {
            return normalized as LanguageLevel;
        }
        if (normalized === 'NATIVE' || normalized === 'FLUENT') {
            return 'Native';
        }
        return null;
    }

    private extractModifier(text: string): "+" | "-" | undefined {
        if (text?.includes('+')) return '+';
        if (text?.includes('-')) return '-';
        return undefined;
    }

    private determinePriority(text: string, language: string): "required" | "preferred" | "nice-to-have" {
        const lowerText = text.toLowerCase();
        const lowerLang = language.toLowerCase();

        if (lowerText.includes(`${lowerLang} required`) || lowerText.includes(`mandatory ${lowerLang}`)) {
            return 'required';
        }
        if (lowerText.includes(`${lowerLang} preferred`) || lowerText.includes(`${lowerLang} would be`)) {
            return 'preferred';
        }
        if (lowerText.includes(`${lowerLang} nice`) || lowerText.includes(`${lowerLang} plus`)) {
            return 'nice-to-have';
        }

        return language === 'English' ? 'required' : 'preferred';
    }

    protected deduplicateLanguages(languages: LanguageRequirement[]): LanguageRequirement[] {
        const seen = new Set<string>();
        return languages.filter(lang => {
            const key = `${lang.language}-${lang.level}-${lang.modifier}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
