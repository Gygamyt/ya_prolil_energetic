import { randomUUID } from 'node:crypto';
import type { FastifyRequest } from 'fastify';

export function getRequestId(req: FastifyRequest): string {
    const hdr = req.headers['x-request-id'];
    return typeof hdr === 'string' && hdr.length > 0 ? hdr : randomUUID();
}
