// packages/api/src/routes/v1/parsing/parsing.schemas.ts

import { z } from 'zod';
import { createJsonSchemaFromZod } from "@app/utils/zod/type-to-schema";

// Input схемы
export const ParseSalesforceInput = z.object({
    input: z.string()
        .min(1, "Input cannot be empty")
        .max(10000, "Input too long (max 10000 characters)"),
    config: z.object({
        // 🔧 FIX: z.coerce для автоматического приведения из string в number
        confidenceThreshold: z.coerce.number().min(0).max(1).optional(),
        fallbackStrategy: z.enum(['flexible', 'strict', 'hybrid']).optional(),
        // 🔧 FIX: z.coerce для автоматического приведения из string в boolean
        enableCaching: z.coerce.boolean().optional()
    }).optional()
});

export const ParseConfigQuery = z.object({
    includeDefaults: z.boolean().optional()
});

// Response схемы
export const ParseResult = z.object({
    success: z.boolean(),
    data: z.object({
        levels: z.array(z.string()).optional(),
        teamSize: z.number().optional(),
        industry: z.string().optional(),
        salesManager: z.string().optional(),
        coordinator: z.string().optional(),
        languageRequirements: z.array(z.object({
            language: z.string(),
            level: z.string(),
            modifier: z.string().optional(),
            priority: z.enum(['required', 'preferred', 'nice-to-have'])
        })).optional(),
        location: z.object({
            regions: z.array(z.string()).optional(),
            workType: z.enum(['Remote', 'Office', 'Hybrid']).optional(),
            timezone: z.string().optional(),
            additionalRequirements: z.string().optional()
        }).optional(),
        experience: z.object({
            minTotalYears: z.number().optional(),
            leadershipRequired: z.boolean().optional(),
            leadershipYears: z.number().optional(),
            roleExperience: z.array(z.object({
                role: z.string(),
                years: z.number(),
                source: z.string(),
                requirements: z.array(z.string()).optional()
            })).optional()
        }).optional(),
        deadline: z.date().optional(),
        role: z.string().optional(),
        responsibilities: z.string().optional(),
        rawInput: z.string(),
        parseStrategy: z.string(),
        status: z.string(),
        createdAt: z.date()
    }).optional(),
    confidence: z.number(),
    strategy: z.string(),
    extractedFields: z.array(z.string()),
    error: z.string().optional()
});

export const ParseResponse = z.object({
    success: z.boolean(),
    data: z.object({
        parseResult: ParseResult,
        metadata: z.object({
            parseTime: z.number(),
            inputLength: z.number(),
            config: z.object({
                confidenceThreshold: z.number(),
                aiProvider: z.string(),
                fallbackStrategy: z.string(),
                enableCaching: z.boolean()
            }),
            timestamp: z.string()
        })
    }).optional(),
    error: z.string().optional(),
    message: z.string().optional()
});

export const ConfigResponse = z.object({
    success: z.boolean(),
    defaultConfig: z.object({
        confidenceThreshold: z.number(),
        aiProvider: z.string(),
        fallbackStrategy: z.string(),
        enableCaching: z.boolean()
    }),
    supportedOptions: z.object({
        aiProvider: z.array(z.string()),
        confidenceThreshold: z.object({
            min: z.number(),
            max: z.number(),
            default: z.number()
        }),
        fallbackStrategy: z.array(z.string()),
        enableCaching: z.object({
            type: z.string(),
            default: z.boolean()
        })
    })
});

export const HealthResponse = z.object({
    success: z.boolean(),
    service: z.string(),
    status: z.string(),
    timestamp: z.string(),
    config: z.object({
        confidenceThreshold: z.number(),
        aiProvider: z.string()
    })
});

// JSON схемы для Fastify
export const ParseSalesforceJsonSchema = createJsonSchemaFromZod(ParseSalesforceInput, {
    name: 'ParseSalesforceInput'
});

export const ParseConfigJsonSchema = createJsonSchemaFromZod(ParseConfigQuery, {
    name: 'ParseConfigQuery'
});

export const ParseResponseJsonSchema = createJsonSchemaFromZod(ParseResponse, {
    name: 'ParseResponse'
});

export const ConfigResponseJsonSchema = createJsonSchemaFromZod(ConfigResponse, {
    name: 'ConfigResponse'
});

export const HealthResponseJsonSchema = createJsonSchemaFromZod(HealthResponse, {
    name: 'HealthResponse'
});
