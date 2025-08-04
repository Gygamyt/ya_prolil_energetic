import { GoogleAuth } from "google-auth-library";
import { env } from "../utils/env.ts";

export function getAuth() {
    return new GoogleAuth({
        keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
        scopes: [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/spreadsheets.readonly",
        ],
    });
}
