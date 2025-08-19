import { BaseStage } from './base.stage';

export enum ExecutionMode {
    SEQUENTIAL = 'sequential',
    PARALLEL = 'parallel',
    HYBRID = 'hybrid'
}

export interface PipelineConfig {
    executionMode?: ExecutionMode;
    continueOnError?: boolean;
    timeout?: number;
    retryCount?: number;
    enableMetrics?: boolean;
    enableProfiling?: boolean;
}

export type StageExecutionPlan = BaseStage[][];

export const DEFAULT_PIPELINE_CONFIG: Required<PipelineConfig> = {
    executionMode: ExecutionMode.SEQUENTIAL,
    continueOnError: true,
    timeout: 30000,
    retryCount: 0,
    enableMetrics: true,
    enableProfiling: false
};
