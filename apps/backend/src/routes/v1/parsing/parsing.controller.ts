// packages/api/src/routes/v1/parsing/parsing.controller.ts

import { ParseSalesforceInput, ParseConfigQuery } from './parsing.schemas';
import type { ParseConfig, ParseStrategy } from "@repo/ai-processing/src/types/request.types";
import { StandardParser } from "@repo/ai-processing/src/parsers/standard.parser";

// Базовая конфигурация парсера
const defaultConfig: ParseConfig = {
    aiProvider: 'gemini' as const, // 🔧 FIX: as const для типа
    confidenceThreshold: 0.6,
    fallbackStrategy: 'flexible' as const, // 🔧 FIX: as const
    enableCaching: true
};

export const parseSalesforceHandler = async (data: unknown) => {
    const input = ParseSalesforceInput.parse(data);

    // 🔧 FIX: Безопасное мержение конфига с проверкой типов
    const finalConfig: ParseConfig = {
        aiProvider: defaultConfig.aiProvider, // Пока всегда gemini для StandardParser
        confidenceThreshold: input.config?.confidenceThreshold ?? defaultConfig.confidenceThreshold,
        fallbackStrategy: input.config?.fallbackStrategy as ParseStrategy ?? defaultConfig.fallbackStrategy,
        enableCaching: input.config?.enableCaching ?? defaultConfig.enableCaching
    };

    // Создаем парсер с финальной конфигурацией
    const parser = new StandardParser(finalConfig);

    // Парсим запрос
    const startTime = Date.now();
    const parseResult = await parser.parse(input.input);
    const parseTime = Date.now() - startTime;

    return {
        parseResult,
        metadata: {
            parseTime,
            inputLength: input.input.length,
            config: finalConfig,
            timestamp: new Date().toISOString()
        }
    };
};

export const getParsingConfigHandler = async (query: unknown) => {
    const searchQuery = ParseConfigQuery.parse(query);

    return {
        defaultConfig,
        supportedOptions: {
            aiProvider: ['gemini'],
            confidenceThreshold: {
                min: 0,
                max: 1,
                default: 0.6
            },
            fallbackStrategy: ['flexible', 'strict', 'hybrid'],
            enableCaching: {
                type: 'boolean',
                default: true
            }
        }
    };
};

export const getParsingHealthHandler = async () => {
    return {
        service: 'StandardParser',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        config: {
            confidenceThreshold: defaultConfig.confidenceThreshold,
            aiProvider: defaultConfig.aiProvider
        }
    };
};
