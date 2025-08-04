import { describe, it, expect } from 'vitest';
import { GoogleAuth } from 'google-auth-library';
import { getAuth } from '../auth';

describe('getAuth()', () => {
    it('should return an instance of GoogleAuth', () => {
        const auth = getAuth();
        expect(auth).toBeInstanceOf(GoogleAuth);
    });

    it('should include required scopes', () => {
        // @ts-ignore: checking internal scopes field
        const scopes: string[] = (getAuth() as any).scopes;
        expect(scopes).toContain('https://www.googleapis.com/auth/drive.readonly');
        expect(scopes).toContain('https://www.googleapis.com/auth/spreadsheets.readonly');
    });
});
