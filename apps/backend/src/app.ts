import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerSwagger } from './plugins/swagger.js';
import { healthRoute } from './routes/v1/health/health.route';
import { MongoDBClient } from "@repo/database/src/client";
import { loggerPlugin } from "@app/plugins/logging";
import { logger } from "@repo/logger/src";
import { employeesRoute } from "@app/routes/v1/employees/employees.route";
import { errorHandlerPlugin } from "@app/plugins/error-handler";

export async function buildApp() {
    const app = Fastify({
        logger: false,
        disableRequestLogging: process.env.NODE_ENV === 'production'
    });

    /**
     * Default fastify plugins
     */
    await app.register(sensible);
    await app.register(cors);
    await app.register(helmet);

    /**
     * Custom plugins
     */
    await app.register(errorHandlerPlugin);
    await app.register(loggerPlugin);
    // await registerLogger(app);
    await registerSwagger(app);

    try {
        await MongoDBClient.getClient();
    } catch (error) {
        logger.error(error);
    }

    /**
     * Graceful shutdown
     */
    app.addHook('onClose', async () => {
        await MongoDBClient.close();
    });

    /**
     * Routers setting
     */
    app.register(healthRoute, { prefix: '/health' });
    app.register(employeesRoute, { prefix: '/v1/users' });

    return app;
}
