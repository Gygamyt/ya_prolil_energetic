import "dotenv/config";
import { readSheetRows, sortRowsByValidation, trimEmptyBorders } from "../logic/sheets.ts";
import { env } from "../utils/env.ts";
import { removeEmptyNonRequiredInfoFrom2DArray } from "../utils/string.helper.ts";
import { arrayToObject, objectKeys } from "../types/employee-object.type.ts";

async function main() {
    try {
        const sheetRaw = await readSheetRows(env.GOOGLE_SHEET_PAGE_NAME)
        const trimmedRows = trimEmptyBorders(sheetRaw);
        const validatedRows = sortRowsByValidation(trimmedRows).validRows;
        const cleanedRows = removeEmptyNonRequiredInfoFrom2DArray(validatedRows);
        const objects = cleanedRows.map(row => arrayToObject(objectKeys, row));
        console.dir(objects);
    } catch (err) {
        console.error("Error reading sheet:", err);
    }
}

main();
