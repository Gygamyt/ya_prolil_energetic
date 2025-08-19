export interface StageResult<T = any> {
    success: boolean;
    data?: T;
    errors?: StageError[];
    metadata: {
        stageName: string;
        executionTime: number;
        confidence?: number;
        method?: string;
        source?: string;
    };
}

export interface StageError {
    code: string;
    message: string;
    stage: string;
    context?: any;
}

export class StageResultBuilder<T> {
    private result: Partial<StageResult<T>> = {
        success: false,
        // errors: [],
        metadata: {} as any
    };

    static success<T>(data: T, stageName: string): StageResult<T> {
        return new StageResultBuilder<T>()
            .setSuccess(true)
            .setData(data)
            .setStageName(stageName)
            .build();
    }

    static failure<T>(error: StageError, stageName: string): StageResult<T> {
        return new StageResultBuilder<T>()
            .setSuccess(false)
            .addError(error)
            .setStageName(stageName)
            .build();
    }

    setSuccess(success: boolean): this {
        this.result.success = success;
        return this;
    }

    setData(data: T): this {
        this.result.data = data;
        return this;
    }

    addError(error: StageError): this {
        if (!this.result.errors) this.result.errors = [];
        this.result.errors.push(error);
        return this;
    }

    setStageName(name: string): this {
        // @ts-ignore
        this.result.metadata = { ...this.result.metadata, stageName: name };
        return this;
    }

    setExecutionTime(time: number): this {
        // @ts-ignore
        this.result.metadata = { ...this.result.metadata, executionTime: time };
        return this;
    }

    setConfidence(confidence: number): this {
        // @ts-ignore
        this.result.metadata = { ...this.result.metadata, confidence };
        return this;
    }

    build(): StageResult<T> {
        return {
            success: this.result.success || false,
            data: this.result.data,
            errors: this.result.errors, // Будет undefined если не было ошибок
            metadata: {
                stageName: '',
                executionTime: 0,
                ...this.result.metadata
            }
        };
    }
}
