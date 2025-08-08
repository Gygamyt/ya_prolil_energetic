import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerSwagger } from './plugins/swagger.js';
import { registerLogger } from './plugins/logger.js';
import { healthRoute } from './routes/health.route.js';
import { usersRoute } from './routes/v1/users.route.js';

export async function buildApp() {
    const app = Fastify({
        logger: false // используем внешний Winston
    });

    await app.register(sensible);
    await app.register(cors);
    await app.register(helmet);

    await registerLogger(app); // ← включаем логгер из @repo/logger
    await registerSwagger(app);

    app.addHook('onResponse', async (req, reply) => {
        console.log('[onResponse]', req.method, req.url, reply.statusCode);
    });

    app.register(healthRoute, { prefix: '/health' });
    app.register(usersRoute, { prefix: '/v1/users' });

    return app;
}
