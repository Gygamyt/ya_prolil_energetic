import "dotenv/config";
import { env } from "../utils/env";
import { removeEmptyNonRequiredInfoFrom2DArray } from "../utils/string.helper";
import { arrayToObject, objectKeys } from "../types/employee-object.type";
import { z } from "zod";
import { GoogleSheetReader } from "../logic/sheets";
import { logger } from "@repo/logger/src/logger-context";
import { cleanEmployeeArraySchema } from "../zod-helper";
import type { CleanEmployeeArray } from "../zod-helper";

/**
 * Fetches raw employee data from a Google Sheet, performs cleaning,
 * validation, and adds externalId to each employee record.
 */
export async function fetchAndValidateEmployeeData(): Promise<CleanEmployeeArray> {
    try {
        logger.info('🔄 Starting to fetch employee data from Google Sheets...');

        const sheetRaw = await GoogleSheetReader.readSheetRows(env.GOOGLE_SHEET_PAGE_NAME);
        logger.debug(`📄 Read ${sheetRaw.length} raw rows from sheet`);

        const trimmedRows = GoogleSheetReader.trimEmptyBorders(sheetRaw);
        logger.debug(`✂️ Trimmed to ${trimmedRows.length} rows`);

        const { validRows, invalidRows } = GoogleSheetReader.sortRowsByValidation(trimmedRows);
        if (invalidRows.length > 0) {
            logger.warn(`⚠️ Found ${invalidRows.length} invalid rows, processing ${validRows.length} valid rows`);
        }

        const cleanedRows = removeEmptyNonRequiredInfoFrom2DArray(validRows);
        logger.debug(`🧹 Cleaned rows, processing ${cleanedRows.length} rows`);

        const objects = cleanedRows.map((row, index) => {
            try {
                return arrayToObject(objectKeys, row);
            } catch (error) {
                logger.error(`❌ Failed to convert row ${index} to object:`, error);
                // @ts-ignore
                throw new Error(`Row ${index} conversion failed: ${error.message}`);
            }
        });

        logger.debug(`🔧 Converted ${objects.length} rows to objects with externalId`);

        const validatedData = cleanEmployeeArraySchema.parse(objects);

        logger.info(`✅  Successfully processed ${validatedData.length} employee records`);
        return validatedData;

    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.error("💥 Zod validation error:", {
                errors: error.errors,
                message: "Employee data failed final validation"
            });
            throw new Error(`Data validation failed: ${error.errors.map(e => e.message).join(', ')}`);
        }

        logger.error("💥 Failed to fetch and validate employee data:", error);
        // @ts-ignore
        throw new Error(`Google Sheets integration failed: ${error.message}`);
    }
}

/**
 * Debug function to check data structure
 */
export async function debugEmployeeData(): Promise<{
    totalRows: number;
    validRows: number;
    invalidRows: number;
    sampleRecord: any;
}> {
    try {
        const sheetRaw = await GoogleSheetReader.readSheetRows(env.GOOGLE_SHEET_PAGE_NAME);
        const trimmedRows = GoogleSheetReader.trimEmptyBorders(sheetRaw);
        const { validRows, invalidRows } = GoogleSheetReader.sortRowsByValidation(trimmedRows);
        const cleanedRows = removeEmptyNonRequiredInfoFrom2DArray(validRows);

        const sampleRecord = cleanedRows.length > 0 ?
            arrayToObject(objectKeys, cleanedRows[0]) :
            null;

        return {
            totalRows: sheetRaw.length,
            validRows: validRows.length,
            invalidRows: invalidRows.length,
            sampleRecord
        };
    } catch (error) {
        logger.error("Debug failed:", error);
        throw error;
    }
}

/**
 * Main entry point for testing
 */
async function main() {
    try {
        const cleanData = await fetchAndValidateEmployeeData();
        logger.info(`🎉 Data successfully validated. Got ${cleanData.length} employees.`);

        if (cleanData.length > 0) {
            logger.info("📋 Sample employee record:", {
                externalId: cleanData[0].externalId,
                name: cleanData[0].Name,
                grade: cleanData[0].Grade,
                role: cleanData[0].Role
            });
        }

    } catch (err) {
        if (err instanceof z.ZodError) {
            logger.error("❌ Validation error details:", err.errors);
        } else {
            logger.error("❌ Unexpected error:", err);
        }
        process.exit(1);
    }
}

// main().then(() => logger.info(`End of read sheet module`));
