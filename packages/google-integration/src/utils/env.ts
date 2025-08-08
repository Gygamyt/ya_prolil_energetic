import * as path from 'path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadDotenv({ path: path.resolve(__dirname, '../../.env'), override: true });

const schema = z.object({
    /**
     * Path to Google service account JSON.
     * Can be relative (from project root) or absolute.
     */
    GOOGLE_APPLICATION_CREDENTIALS: z.string().nonempty(),

    /**
     * ID of the Google Sheet.
     */
    GOOGLE_SHEET_ID: z.string().nonempty(),

    /**
     * Name of the sheet/tab to read.
     */
    GOOGLE_SHEET_PAGE_NAME: z.string().nonempty(),
});

const raw = schema.parse(process.env);

// Compute an absolute path to the credentials JSON,
// resolving relative to the monorepo root.
export const env = {
    ...raw,
    GOOGLE_APPLICATION_CREDENTIALS: path.isAbsolute(raw.GOOGLE_APPLICATION_CREDENTIALS)
        ? raw.GOOGLE_APPLICATION_CREDENTIALS
        : path.resolve(__dirname, '../../', raw.GOOGLE_APPLICATION_CREDENTIALS),
};
