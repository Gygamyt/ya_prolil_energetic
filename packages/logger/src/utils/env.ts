import * as path from "path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");

// Load .env file, overriding any existing process.env values
loadDotenv({ path: envPath, override: true });

/**
 * Validation schema for application environment variables.
 */
const schema = z.object({
    /**
     * The minimum level to log.
     * One of: trace, debug, info, warn, error, fatal
     */
    LOG_LEVEL: z
        .enum(["trace", "debug", "info", "warn", "error", "fatal"])
        .default("info"),

    /**
     * The runtime environment.
     * One of: development, production
     * When "development", pretty-printing is enabled.
     */
    NODE_ENV: z.enum(["development", "production"]).default("production"),
});

/**
 * Parsed and validated environment variables.
 */
export const env = schema.parse(process.env);
