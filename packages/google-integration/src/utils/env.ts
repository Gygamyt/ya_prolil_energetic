// packages/google-integration/src/env.ts
import * as path from "path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.resolve(__dirname, "../.env");
loadDotenv({ path: envPath, override: true });

const schema = z.object({
    GOOGLE_APPLICATION_CREDENTIALS: z.string().nonempty(),
    GOOGLE_SHEET_ID: z.string().nonempty(),
    GOOGLE_SHEET_PAGE_NAME: z.string().nonempty(),
});
export const env = schema.parse(process.env);
