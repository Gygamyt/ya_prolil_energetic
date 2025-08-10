// apps/backend/src/utils/logging/mask.ts
const SENSITIVE = ['password','token','authorization','secret','apikey','api-key'];

export function maskDeep(val: unknown): unknown {
    if (val == null) return val;
    if (typeof val === 'string') return '***';
    if (typeof val === 'number' || typeof val === 'boolean') return '***';
    if (Array.isArray(val)) return val.map(maskDeep);
    if (typeof val === 'object') {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
            if (SENSITIVE.includes(k.toLowerCase())) out[k] = '***';
            else out[k] = maskDeep(v);
        }
        return out;
    }
    return '***';
}
