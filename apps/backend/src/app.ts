import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerSwagger } from './plugins/swagger.js';
import { healthRoute } from './routes/health.route.js';
import { usersRoute } from './routes/v1/users.route.js';
import { MongoDBClient } from "@repo/database/src/client";
import { loggerPlugin } from "@app/plugins/logging";

export async function buildApp() {
    const app = Fastify({ logger: false });

    /**
     * Default fastify plugins
     */
    await app.register(sensible);
    await app.register(cors);
    await app.register(helmet);

    /**
     * Custom plugins
     */
    await app.register(loggerPlugin);
    // await registerLogger(app);
    await registerSwagger(app);

    await MongoDBClient.connect();

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
    // app.register(usersRoute, { prefix: '/v1/users' });

    return app;
}
