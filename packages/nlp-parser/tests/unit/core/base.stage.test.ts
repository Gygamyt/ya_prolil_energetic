import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BaseStage } from "../../../src/core/base.stage";
import { StageContext } from "../../../src/core/stage.interface";
import { StageResult, StageResultBuilder } from "../../../src/core/stage.result";

// Mock конкретная реализация для тестирования
class MockStage extends BaseStage<string, string> {
    name = 'MockStage'
    priority = 1
    dependencies = []

    validate(result: string): boolean {
        return result !== null && result !== undefined && result.length > 0
    }

    protected async performExtraction(input: string, context: StageContext): Promise<StageResult<string>> {
        await new Promise(resolve => setTimeout(resolve, 1))
        if (input === 'fail') {
            return StageResultBuilder.failure<string>(
                { code: 'TEST_FAIL', message: 'Intentional failure', stage: this.name },
                this.name
            )
        }

        if (input === 'invalid') {
            return StageResultBuilder.failure<string>(
                { code: 'VALIDATION_FAILED', message: 'Invalid input provided', stage: this.name },
                this.name
            )
        }

        return StageResultBuilder.success(input.toUpperCase(), this.name)
    }
}

class DependentStage extends BaseStage<string, string> {
    name = 'DependentStage'
    priority = 2
    dependencies = ['RequiredStage']

    protected async performExtraction(input: string): Promise<StageResult<string>> {
        return StageResultBuilder.success(`dependent-${input}`, this.name)
    }
}

describe('BaseStage', () => {
    let mockStage: MockStage
    let context: StageContext

    beforeEach(() => {
        mockStage = new MockStage()
        context = {}
        // Очищаем моки консоли
        vi.clearAllMocks()
    })

    describe('execute', () => {
        it('should execute successfully with valid input', async () => {
            const result = await mockStage.execute('hello', context)

            expect(result.success).toBe(true)
            expect(result.data).toBe('HELLO')
            expect(result.errors).toBeUndefined()
            expect(result.metadata.stageName).toBe('MockStage')
            expect(result.metadata.executionTime).toBeGreaterThan(0)
        })

        it('should fail when performExtraction fails', async () => {
            const result = await mockStage.execute('fail', context)

            expect(result.success).toBe(false)
            expect(result.data).toBeUndefined()
            expect(result.errors).toHaveLength(1)
            expect(result.errors![0].code).toBe('TEST_FAIL')
            expect(result.metadata.stageName).toBe('MockStage')
        })

        it('should fail validation and return validation error', async () => {
            const result = await mockStage.execute('invalid', context)

            expect(result.success).toBe(false)
            expect(result.errors).toHaveLength(1)
            expect(result.errors![0].code).toBe('VALIDATION_FAILED')
        })

        it('should update context on successful execution', async () => {
            await mockStage.execute('hello', context)

            expect(context['MockStage_completed']).toBe(true)
            expect(context['MockStage_result']).toBe('HELLO')
        })

        it('should not update context on failed execution', async () => {
            await mockStage.execute('fail', context)

            expect(context['MockStage_completed']).toBeUndefined()
            expect(context['MockStage_result']).toBeUndefined()
        })

        it('should handle missing dependency and fail execution', async () => {
            const dependentStage = new DependentStage()
            const result = await dependentStage.execute('test', context)

            expect(result.success).toBe(false)
            expect(result.errors![0].message).toContain('Missing dependencies: RequiredStage')
        })
    })

    describe('canExecute', () => {
        it('should return true when no dependencies', () => {
            expect(mockStage.canExecute(context)).toBe(true)
        })

        it('should return false when dependencies not met', () => {
            const dependentStage = new DependentStage()
            expect(dependentStage.canExecute(context)).toBe(false)
        })

        it('should return true when all dependencies are met', () => {
            const dependentStage = new DependentStage()
            context['RequiredStage_completed'] = true

            expect(dependentStage.canExecute(context)).toBe(true)
        })
    })

    describe('validate', () => {
        it('should return true for valid results', () => {
            expect(mockStage.validate('valid')).toBe(true)
        })

        it('should return false for null/undefined', () => {
            expect(mockStage.validate(null as any)).toBe(false)
            expect(mockStage.validate(undefined as any)).toBe(false)
        })
    })

    describe('logging', () => {
        it('should log messages in non-production environment', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {
            })

            // Создаем новый экземпляр для теста логирования
            const testStage = new MockStage()
            testStage['log']('test message')

            expect(consoleSpy).toHaveBeenCalledWith('[MockStage] test message')

            consoleSpy.mockRestore()
        })
    })
})
