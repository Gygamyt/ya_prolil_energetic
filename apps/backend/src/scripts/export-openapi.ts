import Fastify from 'fastify';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';


import sensible from '@fastify/sensible';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { registerSwagger } from '../plugins/swagger.js';

import { healthRoute } from '../routes/v1/health/health.route';
import { usersRoute } from '../routes/v1/users/users.route';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
    const app = Fastify({ logger: false });


    await app.register(sensible);
    await app.register(cors);
    await app.register(helmet);
    await registerSwagger(app);

    app.register(healthRoute, { prefix: '/health' });
    app.register(usersRoute, { prefix: '/v1/users' });

    await app.ready();

    const spec = app.swagger();

    const outPath = resolve(__dirname, '../../openapi.json');
    writeFileSync(outPath, JSON.stringify(spec, null, 2));
    // eslint-disable-next-line no-console
    console.log(`[openapi] spec written to ${outPath}`);

    await app.close();
}

main().catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
});
