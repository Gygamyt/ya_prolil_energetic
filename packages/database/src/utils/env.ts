import * as path from 'path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../../.env');

// Load .env file, overriding any existing process.env values
loadDotenv({ path: envPath, override: true });

/**
 * Validation schema for MongoDB-related environment variables.
 */
const schema = z.object({
    /**
     * MongoDB connection URI, e.g. mongodb://user:pass@host:port.
     */
    MONGODB_URI: z.string().url().nonempty(),

    /**
     * Target database name to use within the MongoDB server.
     */
    MONGODB_DB_NAME: z.string().min(1),
});

/**
 * Parsed and validated environment variables for the database package.
 */
export const dbEnv = schema.parse(process.env);
