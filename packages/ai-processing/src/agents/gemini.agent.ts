import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { generateText } from 'ai';
import { logger } from '@repo/logger/src';
import { geminiConfig } from '../config/gemini.config.js';

export class GeminiEmployeeAgent {
    private readonly model;

    constructor() {
        const google = createGoogleGenerativeAI({
            apiKey: geminiConfig.GOOGLE_API_KEY,
        });

        this.model = google('gemini-1.5-flash');

        logger.info('🔥 GeminiEmployeeAgent initialized', {
            model: 'gemini-1.5-flash',
            debug: geminiConfig.GEMINI_DEBUG
        });
    }

    /**
     * Основной метод для генерации анализа
     */
    async generateAnalysis(prompt: string): Promise<string> {
        const startTime = Date.now();

        try {
            logger.info('📤 Sending analysis request to Gemini', {
                promptLength: prompt.length,
                model: 'gemini-1.5-flash'
            });

            const response = await generateText({
                model: this.model as any,
                prompt: prompt,
                temperature: 0.3
            });

            const duration = Date.now() - startTime;

            logger.info('✅ Gemini analysis completed', {
                duration,
                responseLength: response.text.length,
                tokensUsed: response.usage?.totalTokens
            });

            return response.text;

        } catch (error) {
            logger.error('💥 Gemini analysis failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                promptLength: prompt.length
            });

            throw error;
        }
    }
}
