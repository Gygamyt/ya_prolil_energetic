// packages/google-integration/src/env.ts
import * as path from "path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load package .env
const envPath = path.resolve(__dirname, "../.env");
console.log(`Loading .env from ${envPath}`);
loadDotenv({ path: envPath, override: true });

// Validate
const schema = z.object({
    GOOGLE_APPLICATION_CREDENTIALS: z.string().nonempty(),
    GOOGLE_SHEET_ID: z.string().nonempty(),
});
export const env = schema.parse(process.env);

console.log("Parsed env:", {
    GOOGLE_APPLICATION_CREDENTIALS: env.GOOGLE_APPLICATION_CREDENTIALS,
    GOOGLE_SHEET_ID: env.GOOGLE_SHEET_ID,
});
