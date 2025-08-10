import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '@app/app';

describe('health', () => {
    let app: any;

    beforeAll(async () => {
        app = await buildApp();
    });

    afterAll(async () => {
        await app?.close();
    });

    it('GET /health/live returns ok', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/health/live'
        });

        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toEqual({ status: 'ok' });
    });
});
