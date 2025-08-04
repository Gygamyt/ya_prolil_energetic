import 'dotenv/config';
import { readSheet } from '../src/sheets.ts';
import { env } from "../src/utils/env.ts";

async function main() {
    try {
        const sheetData = await readSheet('AQA Benchinfo', env.GOOGLE_SHEET_ID);
        console.log(JSON.stringify(sheetData.values, null, 2));
    } catch (err) {
        console.error('Error reading sheet:', err);
    }
}

main();
