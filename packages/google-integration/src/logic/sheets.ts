import { google, sheets_v4 } from "googleapis";
import { getAuth } from "./auth.ts";
import { env } from "../utils/env.ts";
import { RawRecordSchema } from "../zod-helper/employee.schema.ts";
import { logger } from "@repo/logger/src";

export class GoogleSheetReader {
    /**
     * Reads any arbitrary range from a sheet.
     */
    public static async readSheet(
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
    public static async readSheetRows(
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
    public static trimEmptyBorders(rows: string[][]): string[][] {
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

    public static sortRowsByValidation(rows: string[][]): { validRows: string[][]; invalidRows: string[][]; } {
        const validRows: string[][] = [];
        const invalidRows: string[][] = [];

        const expectedLen = RawRecordSchema._def.items.length;
        let hasValidationIssues = false;

        rows.forEach((row, idx) => {
            // Validation check for incorrect number of columns
            if (row.length !== expectedLen) {
                const message = `Row has incorrect number of columns. Expected ${expectedLen}, got ${row.length}.`;
                logger.warn(`Issues for row ${idx}: ${message}`, { rowData: row });
                invalidRows.push(row);
                hasValidationIssues = true;
                return;
            }

            const normalized = row.map(cell => cell.trim());
            const result = RawRecordSchema.safeParse(normalized);

            if (result.success) {
                validRows.push(row);
            } else {
                logger.warn(`Issues for row ${idx}: ${result.error.issues[0].message};`, { rowData: row });
                invalidRows.push(row);
                hasValidationIssues = true;
            }
        });

        if (hasValidationIssues) {
            logger.warn("Validation completed with issues, but it's OK if no other validation errors.");
        }

        return { validRows, invalidRows };
    }
}
