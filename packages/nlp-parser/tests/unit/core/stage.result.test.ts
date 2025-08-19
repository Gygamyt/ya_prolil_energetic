import { describe, it, expect } from 'vitest'
import { StageError, StageResultBuilder } from "../../../src/core/stage.result";

describe('StageResultBuilder', () => {
    describe('success builder', () => {
        it('should create successful result', () => {
            const data = 'test data'
            const result = StageResultBuilder.success(data, 'TestStage')

            expect(result.success).toBe(true)
            expect(result.data).toBe(data)
            expect(result.errors).toBeUndefined()
            expect(result.metadata.stageName).toBe('TestStage')
        })
    })

    describe('failure builder', () => {
        it('should create failed result', () => {
            const error: StageError = {
                code: 'TEST_ERROR',
                message: 'Test error message',
                stage: 'TestStage'
            }

            const result = StageResultBuilder.failure(error, 'TestStage')

            expect(result.success).toBe(false)
            expect(result.data).toBeUndefined()
            expect(result.errors).toHaveLength(1)
            expect(result.errors![0]).toEqual(error)
            expect(result.metadata.stageName).toBe('TestStage')
        })
    })

    describe('builder methods', () => {
        it('should chain builder methods correctly', () => {
            const result = new StageResultBuilder<string>()
                .setSuccess(true)
                .setData('test')
                .setStageName('TestStage')
                .setExecutionTime(100)
                .setConfidence(0.95)
                .build()

            expect(result.success).toBe(true)
            expect(result.data).toBe('test')
            expect(result.metadata.stageName).toBe('TestStage')
            expect(result.metadata.executionTime).toBe(100)
            expect(result.metadata.confidence).toBe(0.95)
        })

        it('should handle multiple errors', () => {
            const error1: StageError = { code: 'ERROR1', message: 'First error', stage: 'Test' }
            const error2: StageError = { code: 'ERROR2', message: 'Second error', stage: 'Test' }

            const result = new StageResultBuilder<string>()
                .setSuccess(false)
                .addError(error1)
                .addError(error2)
                .setStageName('TestStage')
                .build()

            expect(result.errors).toHaveLength(2)
            expect(result.errors![0]).toEqual(error1)
            expect(result.errors![1]).toEqual(error2)
        })
    })
})
