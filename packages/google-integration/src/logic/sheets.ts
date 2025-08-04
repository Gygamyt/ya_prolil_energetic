import { google, sheets_v4 } from "googleapis";
import { getAuth } from "./auth.ts";
import { env } from "../utils/env.ts";
import { RecordSchema } from "../zod/employee.schema.ts";

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
 * Reads raw rows from a Google Sheet.
 *
 * @param sheetName - The name of the sheet/tab to read from (e.g., "Sheet1").
 * @param spreadsheetId - The ID of the spreadsheet; defaults to the environment variable GOOGLE_SHEET_ID.
 * @returns A promise that resolves to a 2D array of strings representing the sheet's rows.
 * @throws Will throw if the Google Sheets API request fails.
 */
export async function readSheetRows(
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
    return res.data.values || [];
}

/**
 * Trims empty border rows and columns from a 2D array of sheet values.
 *
 * Removes leading and trailing rows that are entirely empty, then removes
 * leading and trailing columns that are entirely empty. Finally, filters out
 * any rows that remain entirely empty after trimming.
 *
 * @param rows - A 2D array of strings representing raw sheet rows.
 * @returns A new 2D array of strings with empty border rows and columns removed.
 */
export function trimEmptyBorders(rows: string[][]): string[][] {
    if (rows.length === 0) return [];

    // Find topmost non-empty row
    let top = 0;
    let bottom = rows.length - 1;
    while (top <= bottom && rows[top].every(cell => !cell?.toString().trim())) {
        top++;
    }
    // Find bottommost non-empty row
    while (bottom >= top && rows[bottom].every(cell => !cell?.toString().trim())) {
        bottom--;
    }
    const rowSlice = rows.slice(top, bottom + 1);
    if (rowSlice.length === 0) return [];

    // Determine leftmost and rightmost non-empty column
    const colCount = rowSlice[0].length;
    let left = 0;
    let right = colCount - 1;
    while (left <= right && rowSlice.every(row => !row[left]?.toString().trim())) {
        left++;
    }
    while (right >= left && rowSlice.every(row => !row[right]?.toString().trim())) {
        right--;
    }

    // Trim columns and filter out any fully empty rows
    return rowSlice
        .map(row => row.slice(left, right + 1))
        .filter(row => row.some(cell => cell?.toString().trim() !== ""));
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
    return trimmedRows
        .map(row => row.slice(left, right + 1))
        .filter(row => row.some(cell => cell?.toString().trim() !== ""));
}

export function sortRowsByValidation(
    rows: string[][]
): {
    validRows: string[][];
    invalidRows: string[][];
} {
    const validRows: string[][] = [];
    const invalidRows: string[][] = [];

    const expectedLen = RecordSchema._def.items.length;

    rows.forEach((row, idx) => {
        if (row.length !== expectedLen) {
            console.error(`Row ${idx} wrong length:`, row.length);
            invalidRows.push(row);
            return;
        }

        const normalized = row.map(cell => cell.trim());

        const result = RecordSchema.safeParse(normalized);
        if (!result.success) {
            console.error(`Issues for row ${idx}:`, result.error.issues);
        }

        if (result.success) {
            validRows.push(row);
        } else {
            console.error(`Row ${idx} invalid:`, result.error.issues);
            invalidRows.push(row);
        }
    });

    return { validRows, invalidRows };
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
