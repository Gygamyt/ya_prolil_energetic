export interface MatchingRequirements {
    levels?: string[];
    languageRequirements?: LanguageRequirement[];
    teamSize?: number;

    location?: {
        regions?: string[];
        workType?: "Remote" | "Office" | "Hybrid";
        timezone?: string;
    };

    experience?: {
        minTotalYears?: number;
        leadershipRequired?: boolean;
        roleExperience?: RoleExperience[];
    };

    role?: string;
    responsibilities?: string;
    industry?: string;

    skills?: {
        required?: string[];
        preferred?: string[];
    };
}

export interface ClientRequest {
    id: string;

    levels: string[];
    languageRequirements: LanguageRequirement[];
    teamSize: number;

    location: {
        regions?: string[];
        timezone?: string;
        workType?: "Remote" | "Office" | "Hybrid";
        additionalRequirements?: string;
    };

    experience: {
        minTotalYears?: number;
        leadershipRequired: boolean;
        leadershipYears?: number;
        roleExperience?: RoleExperience[];
    };

    skills: {
        required: string[];
        preferred: string[];
        leadership?: string[];
    };

    role: string;
    industry?: string;
    responsibilities: string;
    deadline?: Date;
    salesManager?: string;
    coordinator?: string;

    parseStrategy: ParseStrategy;
    parseConfidence: number;
    rawInput: string;

    status: RequestStatus;
    createdAt: Date;
    processedAt?: Date;
    errorMessage?: string;
}

export interface LanguageRequirement {
    language: SupportedLanguage;
    level: LanguageLevel;
    modifier?: "+" | "-";
    priority: "required" | "preferred" | "nice-to-have";
}

export type SupportedLanguage =
    | "English"
    | "Russian"
    | "Spanish"
    | "German"
    | "French"
    | "Polish"
    | "Ukrainian"
    | "Czech"
    | "Portuguese"
    | "Italian"
    | "Dutch";

export type LanguageLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "Native";

export interface ParseResult {
    success: boolean;
    data?: Partial<ClientRequest>;
    error?: string;
    confidence: number;
    strategy: ParseStrategy;
    extractedFields: string[];
}

export interface CachedParseResult extends ParseResult {
    metadata?: {
        fromCache?: boolean;
        cacheHit?: boolean;
        cacheTime?: number;
        parseTime?: number;
        totalTime?: number;
        [key: string]: any;
    };
}

export type ParseStrategy = "standard" | "flexible" | "hybrid" | "nlp";
export type RequestStatus = "pending" | "processing" | "completed" | "failed";

export interface ParsedSkills {
    required: string[];
    preferred: string[];
    leadership: string[];
    confidence: number;
}

export interface ParseInput {
    data: string;
    parseStrategy?: ParseStrategy;
    clientFormat?: "salesforce" | "custom";
}

export interface ParseConfig {
    aiProvider: "gemini";
    confidenceThreshold: number;
    fallbackStrategy: ParseStrategy;
    enableCaching: boolean;
}

export interface RoleExperience {
    role: string;
    years: number;
    source: string;
    requirements?: string[];
}
