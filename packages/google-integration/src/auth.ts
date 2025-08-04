// packages/google-integration/src/auth.ts
import { GoogleAuth } from "google-auth-library";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./utils/env.ts";

// recreate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getAuth() {
    console.log("Auth keyFilename:", env.GOOGLE_APPLICATION_CREDENTIALS);

    const absolutePath = path.isAbsolute(env.GOOGLE_APPLICATION_CREDENTIALS)
        ? env.GOOGLE_APPLICATION_CREDENTIALS
        : path.resolve(__dirname, "../", env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log("Resolved keyFilename to:", absolutePath);

    return new GoogleAuth({
        keyFilename: absolutePath,
        scopes: [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
        ],
    });
}
