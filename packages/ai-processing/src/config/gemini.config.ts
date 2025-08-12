import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

loadDotenv({ path: envPath, override: true });

const geminiConfigSchema = z.object({
    GOOGLE_API_KEY: z.string().min(1, 'Google API key is required'),
    GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
    GEMINI_DEBUG: z.string().transform(val => val === 'true')
});

export const geminiConfig = geminiConfigSchema.parse(process.env);
