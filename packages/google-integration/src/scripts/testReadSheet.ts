import "dotenv/config";
import { readSheetRows, sortRowsByValidation, trimEmptyBorders } from "../logic/sheets.ts";
import { env } from "../utils/env.ts";

async function main() {
    try {
        const j = sortRowsByValidation(trimEmptyBorders(await readSheetRows(env.GOOGLE_SHEET_PAGE_NAME)));
    } catch (err) {
        console.error("Error reading sheet:", err);
    }
}

main();
