import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StageContext, StageInput } from "../../../src/core/stage.interface";
import { StageResult, StageResultBuilder } from "../../../src/core/stage.result";
import { BaseStage } from "../../../src/core/base.stage";
import { PipelineManager } from "../../../src/core/pipeline.manager";
import { ExecutionMode } from "../../../src/core/pipeline.config";


class MockStageA extends BaseStage<StageInput, string> {
    name = 'StageA'
    priority = 3

    protected async performExtraction(input: StageInput): Promise<StageResult<string>> {
        await new Promise(resolve => setTimeout(resolve, 10)) // Simulate work
        return StageResultBuilder.success('A-processed', this.name)
    }
}

class MockStageB extends BaseStage<StageInput, string> {
    name = 'StageB'
    priority = 2
    dependencies = ['StageA']

    protected async performExtraction(input: StageInput, context: StageContext): Promise<StageResult<string>> {
        const stageAResult = context['StageA_result']
        return StageResultBuilder.success(`B-${stageAResult}`, this.name)
    }
}

class FailingStage extends BaseStage<StageInput, string> {
    name = 'FailingStage'
    priority = 1

    protected async performExtraction(): Promise<StageResult<string>> {
        return StageResultBuilder.failure(
            { code: 'INTENTIONAL_FAIL', message: 'This stage always fails', stage: this.name },
            this.name
        )
    }
}

describe('PipelineManager', () => {
    let pipeline: PipelineManager
    let input: StageInput

    beforeEach(() => {
        pipeline = new PipelineManager()
        input = { originalText: 'test input' }
    })

    describe('addStage', () => {
        it('should add stages successfully', () => {
            const stage = new MockStageA()
            pipeline.addStage(stage)

            expect(pipeline).toBeDefined()
        })

        it('should allow method chaining', () => {
            const result = pipeline
                .addStage(new MockStageA())
                .addStage(new MockStageB())

            expect(result).toBe(pipeline)
        })
    })

    describe('execute - sequential mode', () => {
        beforeEach(() => {
            pipeline = new PipelineManager({ executionMode: ExecutionMode.SEQUENTIAL })
        })

        it('should execute stages in correct order', async () => {
            pipeline
                .addStage(new MockStageB()) // Зависит от StageA
                .addStage(new MockStageA()) // Должен выполниться первым по приоритету

            const result = await pipeline.execute(input)

            expect(result.success).toBe(true)
            expect(result.results.get('StageA')?.success).toBe(true)
            expect(result.results.get('StageB')?.success).toBe(true)
            expect(result.results.get('StageB')?.data).toBe('B-A-processed')
        })

        it('should handle stage failures with continueOnError=true', async () => {
            pipeline = new PipelineManager({ continueOnError: true })

            pipeline
                .addStage(new MockStageA())
                .addStage(new FailingStage())
                .addStage(new MockStageB())

            const result = await pipeline.execute(input)

            expect(result.success).toBe(true) // continueOnError = true
            expect(result.results.get('StageA')?.success).toBe(true)
            expect(result.results.get('FailingStage')?.success).toBe(false)
            expect(result.errors).toHaveLength(1)
        })

        it('should stop on failure with continueOnError=false', async () => {
            pipeline = new PipelineManager({ continueOnError: false })

            pipeline
                .addStage(new FailingStage())
                .addStage(new MockStageA())

            const result = await pipeline.execute(input)

            expect(result.success).toBe(false)
            expect(result.results.get('FailingStage')?.success).toBe(false)
            expect(result.results.has('MockStageA')).toBe(false) // Не должен выполниться
        })
    })

    describe('execute - parallel mode', () => {
        beforeEach(() => {
            pipeline = new PipelineManager({ executionMode: ExecutionMode.PARALLEL })
        })

        it('should execute independent stages in parallel', async () => {
            const stageC = new class extends BaseStage<StageInput, string> {
                name = 'StageC'
                priority = 1
                protected async performExtraction(): Promise<StageResult<string>> {
                    await new Promise(resolve => setTimeout(resolve, 50))
                    return StageResultBuilder.success('C-processed', this.name)
                }
            }

            const stageD = new class extends BaseStage<StageInput, string> {
                name = 'StageD'
                priority = 1
                protected async performExtraction(): Promise<StageResult<string>> {
                    await new Promise(resolve => setTimeout(resolve, 50))
                    return StageResultBuilder.success('D-processed', this.name)
                }
            }

            pipeline.addStage(stageC).addStage(stageD)

            const startTime = Date.now()
            const result = await pipeline.execute(input)
            const executionTime = Date.now() - startTime

            expect(result.success).toBe(true)
            expect(result.results.get('StageC')?.success).toBe(true)
            expect(result.results.get('StageD')?.success).toBe(true)
            // Параллельное выполнение должно быть быстрее последовательного
            expect(executionTime).toBeLessThan(90) // Немного запаса
        })

        it('should respect dependencies in parallel mode', async () => {
            pipeline
                .addStage(new MockStageA()) // Priority 3
                .addStage(new MockStageB()) // Priority 2, depends on StageA

            const result = await pipeline.execute(input)

            expect(result.success).toBe(true)
            expect(result.results.get('StageA')?.success).toBe(true)
            expect(result.results.get('StageB')?.success).toBe(true)
            expect(result.results.get('StageB')?.data).toBe('B-A-processed')
        })
    })

    describe('timeout handling', () => {
        it('should timeout slow stages', async () => {
            const slowStage = new class extends BaseStage<StageInput, string> {
                name = 'SlowStage'
                priority = 1
                protected async performExtraction(): Promise<StageResult<string>> {
                    await new Promise(resolve => setTimeout(resolve, 200))
                    return StageResultBuilder.success('slow-result', this.name)
                }
            }

            pipeline = new PipelineManager({ timeout: 100 })
            pipeline.addStage(slowStage)

            const result = await pipeline.execute(input)

            expect(result.success).toBe(false)
            expect(result.results.get('SlowStage')?.success).toBe(false)
            expect(result.results.get('SlowStage')?.errors![0].code).toBe('TIMEOUT_ERROR')
        })
    })

    describe('result compilation', () => {
        it('should compile extracted data correctly', async () => {
            pipeline
                .addStage(new MockStageA())
                .addStage(new MockStageB())

            const result = await pipeline.execute(input)

            expect(result.extractedData).toEqual({
                StageA: 'A-processed',
                StageB: 'B-A-processed'
            })
        })

        it('should exclude failed stages from extracted data', async () => {
            pipeline = new PipelineManager({ continueOnError: true })

            pipeline
                .addStage(new MockStageA())
                .addStage(new FailingStage())

            const result = await pipeline.execute(input)

            expect(result.extractedData).toEqual({
                StageA: 'A-processed'
                // FailingStage не должен быть в результатах
            })
        })
    })
})
