import { beforeAll, afterAll } from 'vitest';
import { buildApp } from '@app/app';

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
    app = await buildApp();
    // можно сохранить в globalThis для reuse
    (globalThis as any).__app = app;
});

afterAll(async () => {
    await app.close();
});
