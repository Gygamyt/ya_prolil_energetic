import { buildApp } from './app.js';
import { logger } from "@repo/logger/src";
import { backEnv } from "@app/utils/backEnv";
import { prefixes } from "@repo/shared/src";

const port = Number(backEnv.PORT);
const host = backEnv.HOST;

const start = async () => {
    logger.info(`${prefixes.boot} starting buildApp()...`);
    const app = await buildApp();
    logger.info(`${prefixes.boot} app built, launching listen...`);

    const close = async () => {
        logger.info(`${prefixes.boot} shutting down...`);
        try {
            await app.close();
            process.exit(0);
        } catch (err) {
            logger.error(`${prefixes.boot} shutdown error:`, err);
            process.exit(1);
        }
    };

    process.on('SIGTERM', close);
    process.on('SIGINT', close);

    await app.listen({ port, host });
    logger.info(`${prefixes.boot} server listening at http://${host}:${port}`);
};

start().catch((err) => {
    logger.error(`${prefixes.boot} failed to start:`, err);
    process.exit(1);
});
