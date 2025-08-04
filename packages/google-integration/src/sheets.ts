import { google, sheets_v4 } from 'googleapis';
import { getAuth } from './auth';

export async function readSheet(range: string): Promise<sheets_v4.Schema$ValueRange> {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range,
    });
    return response.data;
}
