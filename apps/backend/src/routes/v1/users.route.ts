import type { FastifyPluginAsync } from 'fastify';
import { CreateUserJsonSchema, UserJsonSchema } from './users.schemas.js';

export const usersRoute: FastifyPluginAsync = async (app) => {
    app.post(
        '/',
        {
            schema: {
                body: CreateUserJsonSchema,
                response: {
                    201: UserJsonSchema
                },
                tags: ['users'],
                summary: 'Create user'
            }
        },
        async (req, reply) => {
            const body = req.body as unknown;
            reply.code(201).send({ id: crypto.randomUUID(), ...(body as any) });
        }
    );
};
