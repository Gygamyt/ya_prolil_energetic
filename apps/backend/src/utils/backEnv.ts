import * as path from 'path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'url';
import * as process from "node:process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

// Load .env file, overriding any existing process.env values
loadDotenv({ path: envPath, override: true });

const schema = z.object({
    NODE_ENV: z.string().default(`development`),

    PORT: z.string().default('3000'),

    HOST: z.string().default('0.0.0.0'),

    SERVICE_NAME: z.string().default('backend'),
});

export const backEnv = schema.parse(process.env);
