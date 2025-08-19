import { Stage, StageContext } from './stage.interface';
import { StageResult, StageResultBuilder } from './stage.result';

export abstract class BaseStage<TInput = any, TOutput = any> implements Stage<TInput, TOutput> {
    abstract readonly name: string;
    abstract readonly priority: number;
    readonly dependencies: string[] = [];

    protected readonly isProduction: boolean;

     constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
    }

    canExecute(context: StageContext): boolean {
        // Проверяем что все зависимости выполнены
        return this.dependencies.every(dep => context[`${dep}_completed`] === true);
    }

    async execute(input: TInput, context: StageContext): Promise<StageResult<TOutput>> {
        const startTime = Date.now();

        this.log(`🚀 Starting stage: ${this.name}`);

        try {
            // Проверяем возможность выполнения
            if (!this.canExecute(context)) {
                const missingDeps = this.dependencies.filter(dep => !context[`${dep}_completed`]);
                throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
            }

            // Выполняем основную логику
            const result = await this.performExtraction(input, context);

            // Обновляем контекст только при успешном результате
            if (result.success) {
                // Валидируем результат только для успешных результатов
                if (result.data && !this.validate(result.data)) {
                    this.warn(`⚠️ Validation failed for stage: ${this.name}`);
                    const executionTime = Date.now() - startTime;
                    return {
                        success: false,
                        errors: [{
                            code: 'VALIDATION_FAILED',
                            message: `Validation failed for stage: ${this.name}`,
                            stage: this.name
                        }],
                        metadata: {
                            stageName: this.name,
                            executionTime
                        }
                    };
                }

                // Обновляем контекст только при успехе
                context[`${this.name}_completed`] = true;
                context[`${this.name}_result`] = result.data;

                const executionTime = Date.now() - startTime;
                this.log(`✅ Completed stage: ${this.name} in ${executionTime}ms`);
            } else {
                const executionTime = Date.now() - startTime;
                this.warn(`❌ Failed stage: ${this.name} in ${executionTime}ms`);
            }

            const executionTime = Date.now() - startTime;
            return {
                ...result,
                metadata: {
                    ...result.metadata,
                    executionTime
                }
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            this.error(`❌ Failed stage: ${this.name}`, error);

            // ✅ ИСПРАВЛЕНО: создаем объект напрямую, а не через builder
            return {
                success: false,
                errors: [{
                    code: 'EXECUTION_ERROR',
                    message: error instanceof Error ? error.message : 'Unknown error',
                    stage: this.name,
                    context: error
                }],
                metadata: {
                    stageName: this.name,
                    executionTime
                }
            };
        }
    }

    // Абстрактные методы для реализации в наследниках
    protected abstract performExtraction(input: TInput, context: StageContext): Promise<StageResult<TOutput>>;

    validate(result: TOutput): boolean {
        // Базовая валидация - можно переопределить в наследниках
        return result !== null && result !== undefined;
    }

    // Утилиты логирования
    protected log(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.log(`[${this.name}] ${message}`, ...args);
        }
    }

    protected warn(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.warn(`[${this.name}] ${message}`, ...args);
        }
    }

    protected error(message: string, ...args: any[]) {
        if (!this.isProduction) {
            console.error(`[${this.name}] ${message}`, ...args);
        }
    }
}
