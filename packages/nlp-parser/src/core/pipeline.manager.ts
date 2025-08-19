import { BaseStage } from './base.stage';
import { StageResult, StageError } from './stage.result';
import { StageContext, StageInput } from './stage.interface';
import { ExecutionMode, PipelineConfig, StageExecutionPlan } from "./pipeline.config";

export interface PipelineResult {
    success: boolean;
    results: Map<string, StageResult>;
    errors: StageError[];
    totalExecutionTime: number;
    extractedData: Record<string, any>;
}

export class PipelineManager {
    private stages = new Map<string, BaseStage>();
    private config: PipelineConfig;
    private readonly isProduction: boolean;

    constructor(config: PipelineConfig = {}) {
        this.config = {
            executionMode: ExecutionMode.SEQUENTIAL,
            continueOnError: true,
            timeout: 30000,
            retryCount: 0,
            ...config
        };
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    // Управление этапами
    addStage(stage: BaseStage): this {
        this.stages.set(stage.name, stage);
        this.log(`📋 Added stage: ${stage.name} (priority: ${stage.priority})`);
        return this;
    }

    removeStage(stageName: string): this {
        this.stages.delete(stageName);
        this.log(`🗑️ Removed stage: ${stageName}`);
        return this;
    }

    // Главный метод выполнения пайплайна
    async execute(input: StageInput): Promise<{
        success: undefined | boolean;
        results: Map<string, StageResult>;
        errors: StageError[];
        totalExecutionTime: number;
        extractedData: Record<string, any>
    }> {
        const startTime = Date.now();
        const context: StageContext = { input };
        const results = new Map<string, StageResult>();
        const errors: StageError[] = [];

        this.log(`🚀 Starting pipeline execution with ${this.stages.size} stages`);
        this.log(`📊 Execution mode: ${this.config.executionMode}`);

        try {
            // Создаем план выполнения
            const executionPlan = this.createExecutionPlan();
            this.log(`📋 Execution plan created: ${executionPlan.map((group: any[]) =>
                group.map(s => s.name).join(', ')
            ).join(' → ')}`);

            // Выполняем этапы согласно плану
            for (const stageGroup of executionPlan) {
                const groupResults = await this.executeStageGroup(stageGroup, input, context);

                // Собираем результаты
                for (const [stageName, result] of groupResults) {
                    results.set(stageName, result);

                    if (!result.success) {
                        if (result.errors) errors.push(...result.errors);

                        if (!this.config.continueOnError) {
                            this.log(`❌ Stopping pipeline due to stage failure: ${stageName}`);
                            break;
                        }
                    }
                }
            }

            const totalExecutionTime = Date.now() - startTime;
            const extractedData = this.compileExtractedData(results);

            // ✅ ИСПРАВЛЕНО: разная логика success в зависимости от continueOnError
            const successCount = Array.from(results.values()).filter(r => r.success).length;
            const hasResults = results.size > 0;

            let success: boolean;
            if (this.config.continueOnError) {
                success = hasResults && successCount > 0;
            } else {
                success = hasResults && successCount === results.size && errors.length === 0;
            }

            this.log(`${success ? '✅' : '❌'} Pipeline completed in ${totalExecutionTime}ms`);
            this.log(`📊 Success rate: ${this.calculateSuccessRate(results)}%`);

            return {
                success,
                results,
                errors,
                totalExecutionTime,
                extractedData
            };

        } catch (error) {
            const totalExecutionTime = Date.now() - startTime;
            this.error('❌ Pipeline execution failed:', error);

            errors.push({
                code: 'PIPELINE_ERROR',
                message: error instanceof Error ? error.message : 'Unknown pipeline error',
                stage: 'PipelineManager'
            });

            return {
                success: false,
                results,
                errors,
                totalExecutionTime,
                extractedData: {}
            };
        }
    }

    // Создание плана выполнения с учетом зависимостей
    private createExecutionPlan(): StageExecutionPlan {
        const sortedStages = Array.from(this.stages.values())
            .sort((a, b) => {
                // Сначала по приоритету, потом по зависимостям
                if (b.priority !== a.priority) return b.priority - a.priority;
                return a.dependencies.length - b.dependencies.length;
            });

        if (this.config.executionMode === ExecutionMode.PARALLEL) {
            return this.createParallelExecutionPlan(sortedStages);
        } else {
            return [sortedStages]; // Sequential: все этапы в одной группе
        }
    }

    private createParallelExecutionPlan(stages: BaseStage[]): StageExecutionPlan {
        const plan: StageExecutionPlan = [];
        const processed = new Set<string>();
        const remaining = [...stages];

        while (remaining.length > 0) {
            const currentGroup: BaseStage[] = [];

            // Находим этапы, которые можно выполнить параллельно
            for (let i = remaining.length - 1; i >= 0; i--) {
                const stage = remaining[i];

                // Проверяем что все зависимости уже обработаны
                if (stage.dependencies.every(dep => processed.has(dep))) {
                    currentGroup.push(stage);
                    remaining.splice(i, 1);
                }
            }

            if (currentGroup.length === 0) {
                throw new Error('Circular dependency detected in pipeline stages');
            }

            plan.push(currentGroup);
            currentGroup.forEach(stage => processed.add(stage.name));
        }

        return plan;
    }

    // Выполнение группы этапов
    private async executeStageGroup(
        stages: BaseStage[],
        input: StageInput,
        context: StageContext
    ): Promise<Map<string, StageResult>> {
        const results = new Map<string, StageResult>();

        if (this.config.executionMode === ExecutionMode.PARALLEL && stages.length > 1) {
            // Параллельное выполнение
            this.log(`⚡ Executing ${stages.length} stages in parallel`);

            const promises = stages.map(stage =>
                this.executeStageWithTimeout(stage, input, context)
            );

            const stageResults = await Promise.allSettled(promises);

            stages.forEach((stage, index) => {
                const promiseResult = stageResults[index];
                if (promiseResult.status === 'fulfilled') {
                    results.set(stage.name, promiseResult.value);
                } else {
                    results.set(stage.name, {
                        success: false,
                        errors: [{
                            code: 'PARALLEL_EXECUTION_ERROR',
                            message: promiseResult.reason?.message || 'Parallel execution failed',
                            stage: stage.name
                        }],
                        metadata: {
                            stageName: stage.name,
                            executionTime: 0
                        }
                    });
                }
            });
        } else {
            // Последовательное выполнение
            for (const stage of stages) {
                this.log(`🔄 Executing stage: ${stage.name}`);
                const result = await this.executeStageWithTimeout(stage, input, context);
                results.set(stage.name, result);

                if (!result.success && !this.config.continueOnError) {
                    break;
                }
            }
        }

        return results;
    }

    private async executeStageWithTimeout(
        stage: BaseStage,
        input: StageInput,
        context: StageContext
    ): Promise<StageResult> {
        let timeoutId: NodeJS.Timeout;
        let isResolved = false;

        const timeoutPromise = new Promise<StageResult>((resolve) => {
            timeoutId = setTimeout(() => {
                if (!isResolved) {
                    isResolved = true;
                    resolve({
                        success: false,
                        errors: [{
                            code: 'TIMEOUT_ERROR',
                            message: `Stage execution timeout: ${this.config.timeout}ms`,
                            stage: stage.name
                        }],
                        metadata: {
                            stageName: stage.name,
                            executionTime: this.config.timeout || 0
                        }
                    });
                }
            }, this.config.timeout);
        });

        const stagePromise = stage.execute(input, context)
            .then(result => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                }
                return result;
            })
            .catch(error => {
                if (!isResolved) {
                    isResolved = true;
                    clearTimeout(timeoutId);
                }
                return {
                    success: false,
                    errors: [{
                        code: 'EXECUTION_ERROR',
                        message: error.message,
                        stage: stage.name
                    }],
                    metadata: {
                        stageName: stage.name,
                        executionTime: 0
                    }
                };
            });

        return Promise.race([stagePromise, timeoutPromise]);
    }


    // Компиляция извлеченных данных
    private compileExtractedData(results: Map<string, StageResult>): Record<string, any> {
        const extractedData: Record<string, any> = {};

        for (const [stageName, result] of results) {
            if (result.success && result.data) {
                extractedData[stageName] = result.data;
            }
        }

        return extractedData;
    }

    // Подсчет успешности выполнения
    private calculateSuccessRate(results: Map<string, StageResult>): number {
        const successCount = Array.from(results.values()).filter(r => r.success).length;
        return Math.round((successCount / results.size) * 100);
    }

    // Утилиты логирования
    private log(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.log(`[PipelineManager] ${message}`, ...args);
        }
    }

    private error(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.error(`[PipelineManager] ${message}`, ...args);
        }
    }
}
