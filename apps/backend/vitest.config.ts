import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        setupFiles: ['./src/plugins/logging/__tests__/setup.ts'],
        isolate: true,
        clearMocks: true,
        restoreMocks: true,
    },
    resolve: {
        alias: {
            '@app': path.resolve(__dirname, './src'),
            '@repo/logger/src': path.resolve(__dirname, '../../packages/logger/src'),
        },
    },
});
