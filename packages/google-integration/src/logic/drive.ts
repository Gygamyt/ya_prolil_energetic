import { google } from 'googleapis';
import { getAuth } from './auth.ts';

export async function downloadFile(fileId: string): Promise<Buffer> {
    const auth = getAuth();
    const drive = google.drive({ version: 'v3', auth });
    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data as ArrayBuffer);
}
