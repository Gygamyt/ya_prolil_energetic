import { StageResult } from "./stage.result";

export interface StageContext {
    [key: string]: any;
}

export interface StageInput {
    originalText: string;
    normalizedText?: string;
    metadata?: Record<string, any>;
}

export interface StageError {
    code: string;
    message: string;
    stage: string;
    context?: any;
}

export interface Stage<TInput = any, TOutput = any> {
    readonly name: string;
    readonly priority: number;
    readonly dependencies: string[];

    canExecute(context: StageContext): boolean;
    execute(input: TInput, context: StageContext): Promise<StageResult<TOutput>>;
    validate(result: TOutput): boolean;
}
