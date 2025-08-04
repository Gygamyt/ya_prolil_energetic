import { google, sheets_v4 } from "googleapis";
import { getAuth } from "./auth.ts";
import { env } from "./utils/env.ts";

/**
 * Reads any arbitrary range from a sheet.
 */
export async function readSheet(
    range: string,
    spreadsheetId: string = env.GOOGLE_SHEET_ID
): Promise<sheets_v4.Schema$ValueRange> {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
    return response.data;
}

/**
 * Это чучело дохнет по причине того, что таблица специфично сделана, а я ленивый, но оставить надо
 * Reads an entire sheet but trims off trailing empty columns.
 * Includes detailed logging for debugging.
 *
 * @param sheetName – e.g. "AQA Benchinfo"
 * @param spreadsheetId – defaults to env.GOOGLE_SHEET_ID
 * @returns array of rows (each an array of strings)
 */
export async function readSheetSmart(
    sheetName: string,
    spreadsheetId: string = env.GOOGLE_SHEET_ID
): Promise<string[][]> {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const headerRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!1:1`,
        majorDimension: "ROWS",
    });
    const headers = headerRes.data.values?.[0] || [];
    let lastIdx = headers.length - 1;
    while (lastIdx >= 0 && (!headers[lastIdx] || headers[lastIdx].trim() === "")) {
        lastIdx--;
    }
    if (lastIdx < 0) {
        return [];
    }
    function colLetter(idx: number): string {
        let s = "";
        while (idx >= 0) {
            s = String.fromCharCode((idx % 26) + 65) + s;
            idx = Math.floor(idx / 26) - 1;
        }
        return s;
    }
    const lastCol = colLetter(lastIdx);
    const range = `${sheetName}!A1:${lastCol}`;
    const fullRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        majorDimension: "ROWS",
        valueRenderOption: "FORMATTED_VALUE",
    });
    return fullRes.data.values || [];
}

/**
 * Reads rows from a sheet up to the first occurrence of "stop" in column A,
 * then trims trailing empty cells on each row.
 *
 * @param sheetName – e.g. "AQA Benchinfo"
 * @param spreadsheetId – defaults to env.GOOGLE_SHEET_ID
 * @returns array of rows (each an array of strings), excluding the "stop" row
 */
export async function readUntilStop(
    sheetName: string,
    spreadsheetId: string = env.GOOGLE_SHEET_ID
): Promise<string[][]> {
    console.log(`readUntilStop: sheet="${sheetName}"`);

    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    // 1) Find stop row in column A
    const colARes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
        majorDimension: "COLUMNS",
    });
    const colA = colARes.data.values?.[0]?.map((v) => (v || "").toString().toLowerCase()) || [];
    console.log("Column A preview:", colA.slice(0, 20));

    const stopIdx = colA.findIndex((cell) => cell === "stop");
    const endRow = stopIdx >= 0 ? stopIdx : colA.length;
    if (endRow <= 1) {
        console.log("No data before stop; returning []");
        return [];
    }

    // 2) Fetch all columns A:Z (or adjust Z to expected max)
    const dataRes = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z${endRow - 1}`,
        majorDimension: "ROWS",
        valueRenderOption: "FORMATTED_VALUE",
    });
    const rows = dataRes.data.values || [];
    console.log(`Fetched ${rows.length} rows and up to ${rows[0]?.length || 0} columns`);

    // 3) Trim trailing empty cells on each row
    const trimmed = rows.map((row) => {
        let last = row.length - 1;
        while (last >= 0 && (!row[last] || row[last].toString().trim() === "")) {
            last--;
        }
        return row.slice(0, last + 1);
    });

    console.log("Trimmed rows preview:", trimmed.slice(0, 5));
    return trimmed;
}

/** Helper: convert 0-based index to column letter (0 → A, 25 → Z, 26 → AA) */
function colLetter(idx: number): string {
    let s = "";
    while (idx >= 0) {
        s = String.fromCharCode((idx % 26) + 65) + s;
        idx = Math.floor(idx / 26) - 1;
    }
    return s;
}
