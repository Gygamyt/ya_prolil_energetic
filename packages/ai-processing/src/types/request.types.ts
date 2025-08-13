export interface ClientRequest {
    id: string;

    // Основные требования (с поддержкой всех плюсов/минусов)
    levels: string[];              // ["Junior+", "Middle", "Senior"]
    languageRequirements: LanguageRequirement[];
    teamSize: number;

    // Расширенная локация
    location: {
        regions?: string[];          // ["EU", "US"]
        timezone?: string;           // "EST", "CET"
        workType?: "Remote" | "Office" | "Hybrid";
        additionalRequirements?: string;
    };

    // Опыт и лидерство
    experience: {
        minTotalYears?: number;
        leadershipRequired: boolean;
        leadershipYears?: number;
        roleExperience?: RoleExperience[];
    };

    // Навыки с приоритизацией
    skills: {
        required: string[];
        preferred: string[];
        leadership?: string[];
    };

    // Метаданные
    role: string;
    industry?: string;
    responsibilities: string;
    deadline?: Date;
    salesManager?: string;
    coordinator?: string;

    // Парсинг метаданные
    parseStrategy: ParseStrategy;
    parseConfidence: number;
    rawInput: string;

    // Системные поля
    status: RequestStatus;
    createdAt: Date;
    processedAt?: Date;
    errorMessage?: string;
}

// Новый интерфейс для языков
export interface LanguageRequirement {
    language: SupportedLanguage;
    level: LanguageLevel;
    modifier?: "+" | "-";          // B2+, C1-
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

export type ParseStrategy = "standard" | "flexible" | "hybrid";
export type RequestStatus = "pending" | "processing" | "completed" | "failed";

export interface ParsedSkills {
    required: string[];
    preferred: string[];
    leadership: string[];
    confidence: number;
}

// Входные данные для парсера
export interface ParseInput {
    data: string;                 // сырой текст запроса
    parseStrategy?: ParseStrategy; // стратегия парсинга
    clientFormat?: "salesforce" | "custom"; // формат клиента
}

// Конфигурация парсеров
export interface ParseConfig {
    aiProvider: "gemini";
    confidenceThreshold: number;  // минимальный confidence для успеха
    fallbackStrategy: ParseStrategy;
    enableCaching: boolean;
}

export interface RoleExperience {
    role: string;           // "QA Engineer", "Lead QA", "Senior Developer"
    years: number;          // 8
    source: string;         // "field_14" или "field_33"
    requirements?: string[]; // ["team leadership", "mentoring", "automation"]
}
