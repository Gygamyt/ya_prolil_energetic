import { google } from 'googleapis';
import { getAuth } from './auth.ts';
import { env } from "./utils/env.ts";

export async function readSheet(range: string, spreadsheetId: string = env.GOOGLE_SHEET_ID!) {
    const auth = getAuth();
    console.log(getAuth());
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
    });
    return response.data;
}
