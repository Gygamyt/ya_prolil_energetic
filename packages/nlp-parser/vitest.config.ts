import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'node',
        globals: true,
        include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
        exclude: ['tests/e2e/**', 'node_modules/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.d.ts',
                '**/*.interface.ts',
                '**/index.ts',
                'temp/**'
            ]
        },
        testTimeout: 10000,
        hookTimeout: 10000
    }
})
