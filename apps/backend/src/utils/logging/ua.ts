import { UAParser } from 'ua-parser-js';

export function parseUA(ua?: string | string[]) {
    if (!ua) return undefined;
    const raw = Array.isArray(ua) ? ua[0] : ua;
    if (!raw) return undefined;

    const p = new UAParser(raw);
    const b = p.getBrowser();
    const os = p.getOS();
    const d = p.getDevice();
    const e = p.getEngine();

    return {
        raw,
        browser: { name: b.name || undefined, version: b.version || undefined },
        os: { name: os.name || undefined, version: os.version || undefined },
        device: { type: d.type || undefined, vendor: d.vendor || undefined, model: d.model || undefined },
        engine: { name: e.name || undefined, version: e.version || undefined },
    };
}

export function formatUaShort(ua?: ReturnType<typeof parseUA>): string | undefined {
    if (!ua) return undefined;
    const b = ua.browser?.name
        ? `${ua.browser.name}${ua.browser.version ? ' ' + ua.browser.version : ''}`
        : 'Unknown';
    const o = ua.os?.name
        ? `${ua.os.name}${ua.os.version ? ' ' + ua.os.version : ''}`
        : '';
    return o ? `${b} on ${o}` : b;
}
