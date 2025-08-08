import { describe, it, expect } from 'vitest';
import { buildApp } from "@app/app";


describe('health', () => {
    it('GET /health/live returns ok', async () => {
        const app = await buildApp();
        const res = await app.inject({ method: 'GET', url: '/health/live' });
        expect(res.statusCode).toBe(200);
        expect(res.json()).toEqual({ status: 'ok' });
        await app.close();
    });
});
