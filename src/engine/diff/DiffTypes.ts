export type PolicyMode = 'additive' | 'reconcile' | 'strict';

export type DiffOperationType =
    | 'create'
    | 'update'
    | 'delete'
    | 'noop';

export interface DiffOperation<T> {
    type: DiffOperationType;
    key: string;
    desired?: T;
    actual?: T;
    reason: string;
}

export interface DiffResult<T> {
    mode: PolicyMode;
    operations: DiffOperation<T>[];
    summary: {
        create: number;
        update: number;
        delete: number;
        noop: number;
    };
}
