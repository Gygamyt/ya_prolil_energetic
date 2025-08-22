export interface ExtractionRoleConfig {
    keywords?: string[];
    excludePatterns?: string[];
    maxLength?: number;
    minLength?: number;
}

export interface TechnologyConfig {
    languages?: string[];
    frameworks?: string[];
    databases?: string[];
    tools?: string[];
    platforms?: string[];
}

export interface RoleExtractionResult {
    role: string;
    confidence: number;
    method: 'pattern' | 'keyword' | 'nlp' | 'fallback';
    source?: string;
    testingType?: 'manual' | 'automation' | 'both' | 'unknown';
}

export interface RoleExtractionConfig {
    keywords?: string[];
    excludePatterns?: string[];
    maxLength?: number;
    minLength?: number;
    enableNlpFallback?: boolean;
}

export interface RolePattern {
    pattern: RegExp;
    priority: number;
    normalize?: (match: string) => string;
}

export interface RoleExtractionStats {
    totalAttempts: number;
    success: number;
    byMethod: Record<'pattern' | 'keyword' | 'nlp' | 'fallback', number>;
    topRoles: Record<string, number>;
}

