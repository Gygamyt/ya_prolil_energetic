import { buildApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

const start = async () => {
    console.log('[bootstrap] starting buildApp()...');
    const app = await buildApp();
    console.log('[bootstrap] app built, launching listen...');

    const close = async () => {
        console.log('[bootstrap] shutting down...');
        try {
            await app.close();
            process.exit(0);
        } catch (err) {
            console.error('[bootstrap] shutdown error:', err);
            process.exit(1);
        }
    };

    process.on('SIGTERM', close);
    process.on('SIGINT', close);

    await app.listen({ port, host });
    console.log(`[bootstrap] server listening at http://${host}:${port}`);
};

start().catch((err) => {
    console.error('[bootstrap] failed to start:', err);
    process.exit(1);
});
