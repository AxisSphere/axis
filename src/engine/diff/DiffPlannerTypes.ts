import { DiffOperationType, PolicyMode } from './DiffTypes';

export interface PlannedStep<T> {
    order: number;
    type: DiffOperationType;
    key: string;
    desired?: T;
    actual?: T;
    reason: string;
    safe: boolean;
}

export interface ExecutionPlan<T> {
    mode: PolicyMode;
    steps: PlannedStep<T>[]
    summary: {
        executable: number;
        skipped: number;
        dangerous: number;
    };
}

