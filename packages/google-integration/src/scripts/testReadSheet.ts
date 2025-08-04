import "dotenv/config";
import { readSheetRows, sortRowsByValidation, trimEmptyBorders } from "../logic/sheets.ts";
import { env } from "../utils/env.ts";
import { removeEmptyNonRequiredInfoFrom2DArray } from "../utils/string.helper.ts";
import { arrayToObject, objectKeys } from "../types/employee-object.type.ts";
import { z } from "zod";
import { cleanEmployeeArraySchema } from "../zod-helper/index.ts";

/**
 * Imports the CleanEmployeeArray type declaration for static type-checking.
 * The `import type` syntax is used to ensure this import is removed at runtime,
 * preventing 'module not found' errors since types do not exist in JavaScript.
 */
import type { CleanEmployeeArray } from "../zod-helper/index.ts";

/**
 * @file This module provides functionality to fetch, process, and validate employee data from a Google Sheet.
 */

/**
 * Fetches raw employee data from a Google Sheet, performs a series of cleaning
 * and validation steps, and returns a fully validated array of employee objects.
 *
 * This function encapsulates the entire data processing pipeline:
 * 1. Reads the raw 2D array from the Google Sheet.
 * 2. Trims empty rows and columns from the raw data.
 * 3. Filters out rows that are considered invalid.
 * 4. Removes non-required information (e.g., empty strings, boolean flags).
 * 5. Maps the cleaned arrays to structured employee objects.
 * 6. Validates the final array of objects against the `cleanEmployeeArraySchema`.
 *
 * @async
 * @returns {Promise<CleanEmployeeArray>} A promise that resolves to an array of validated employee objects.
 * @throws {Error} Throws an error if reading the sheet fails.
 * @throws {z.ZodError} Throws a ZodError if the final data fails schema validation.
 */
export async function fetchAndValidateEmployeeData(): Promise<CleanEmployeeArray> {
    const sheetRaw = await readSheetRows(env.GOOGLE_SHEET_PAGE_NAME);
    const trimmedRows = trimEmptyBorders(sheetRaw);
    const validatedRows = sortRowsByValidation(trimmedRows).validRows;
    const cleanedRows = removeEmptyNonRequiredInfoFrom2DArray(validatedRows);
    const objects = cleanedRows.map(row => arrayToObject(objectKeys, row));

    return cleanEmployeeArraySchema.parse(objects);
}

/**
 * The main entry point for the script.
 * This function calls `fetchAndValidateEmployeeData` and logs the result or any caught errors.
 * It is designed to be executed when the file is run directly.
 * @async
 */
async function main() {
    try {
        const cleanData = await fetchAndValidateEmployeeData();
        console.log("Data successfully validated and ready for use:");
        console.dir(cleanData);
    } catch (err) {
        console.error("Error during data processing:", err);
        if (err instanceof z.ZodError) {
            console.error("Validation error details:", err.errors);
        }
    }
}

main();
