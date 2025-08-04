import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { google } from 'googleapis';
import { getAuth } from '../auth';
import { readSheet } from '../sheets';
import { downloadFile } from '../drive';
import * as XLSX from 'xlsx';

vi.mock('../auth', () => ({
    getAuth: vi.fn(),
}));

vi.mock('googleapis', () => {
    const actual = vi.importActual<any>('googleapis');
    return {
        ...actual,
        google: {
            sheets: vi.fn(),
            drive: vi.fn(),
        },
    };
});

describe('Google Integration Module', () => {
    const fakeAuth = {} as any;
    const fakeSheetResponse = { data: { values: [['A1', 'B1'], ['A2', 'B2']] } };
    const fakeFileId = 'file123';
    const excelBuffer = XLSX.write(
        { Sheets: { Sheet1: XLSX.utils.aoa_to_sheet([['X', 'Y']]) }, SheetNames: ['Sheet1'] },
        { bookType: 'xlsx', type: 'buffer' }
    );

    beforeEach(() => {
        vi.resetAllMocks();
        (getAuth as unknown as Mock).mockReturnValue(fakeAuth);

        const sheetsMock = {
            spreadsheets: {
                values: { get: vi.fn().mockResolvedValue(fakeSheetResponse) },
            },
        };
        (google.sheets as unknown as Mock).mockReturnValue(sheetsMock);

        const driveMock = {
            files: { get: vi.fn().mockResolvedValue({ data: excelBuffer }) },
        };
        (google.drive as unknown as Mock).mockReturnValue(driveMock);
    });

    it('readSheet() should return sheet data', async () => {
        const result = await readSheet('Sheet1!A1:B2');
        expect(getAuth).toHaveBeenCalled();
        expect(google.sheets).toHaveBeenCalledWith({ version: 'v4', auth: fakeAuth });
        expect(result).toEqual(fakeSheetResponse.data);
    });

    it('downloadFile() should fetch and return a Buffer', async () => {
        const buffer = await downloadFile(fakeFileId);
        expect(getAuth).toHaveBeenCalled();
        expect(google.drive).toHaveBeenCalledWith({ version: 'v3', auth: fakeAuth });
        expect(Buffer.isBuffer(buffer)).toBe(true);

        const workbook = XLSX.read(buffer, { type: 'buffer' });
        expect(workbook.SheetNames).toContain('Sheet1');
    });
});
