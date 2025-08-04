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

export async function readAndTrim(
    sheetName: string,
    spreadsheetId: string = env.GOOGLE_SHEET_ID
): Promise<string[][]> {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });

    const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z1000`,
        majorDimension: "ROWS",
        valueRenderOption: "FORMATTED_VALUE",
    });
    const allRows = res.data.values || [];

    let top = 0, bottom = allRows.length - 1;
    while (top <= bottom && allRows[top].every(cell => !cell?.toString().trim())) top++;
    while (bottom >= top && allRows[bottom].every(cell => !cell?.toString().trim())) bottom--;
    const trimmedRows = allRows.slice(top, bottom + 1);

    if (!trimmedRows.length) return [];
    const colCount = trimmedRows[0].length;
    let left = 0, right = colCount - 1;
    while (left <= right && trimmedRows.every(row => !row[left]?.toString().trim())) left++;
    while (right >= left && trimmedRows.every(row => !row[right]?.toString().trim())) right--;
    return trimmedRows.map(row => row.slice(left, right + 1));
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
