import { DiffOperation, DiffResult, PolicyMode } from './DiffTypes';

export interface DiffableEntity {
    key: string;
    hash(): string;
}

export class PolicyDiffEngine<T extends DiffableEntity> {
    constructor(
        private readonly mode: PolicyMode
    ) {}

    diff(desired: T[], actual: T[]): DiffResult<T> {
        const desiredMap = new Map(desired.map(d => [d.key, d]));
        const actualMap = new Map(actual.map(a => [a.key, a]));

        const operations: DiffOperation<T>[] = [];

        // 1. Desired → Actual
        for (const [key, desiredEntity] of desiredMap) {
            const actualEntity = actualMap.get(key);

            if (!actualEntity) {
                operations.push({
                    type: 'create',
                    key,
                    desired: desiredEntity,
                    reason: 'Entity missing in actual state'
                });
                continue;
            }

            if (desiredEntity.hash() !== actualEntity.hash()) {
                if (this.mode === 'additive') {
                    operations.push({
                        type: 'noop',
                        key,
                        desired: desiredEntity,
                        actual: actualEntity,
                        reason: 'Additive mode ignores updates'
                    });
                } else {
                    operations.push({
                        type: 'update',
                        key,
                        desired: desiredEntity,
                        actual: actualEntity,
                        reason: 'Entity differs from policy'
                    });
                }
            } else {
                operations.push({
                    type: 'noop',
                    key,
                    desired: desiredEntity,
                    actual: actualEntity,
                    reason: 'Entity matches policy'
                });
            }
        }

        // 2. Actual → Desired (orphans)
        for (const [key, actualEntity] of actualMap)
        {
            if (!desiredMap.has(key))
            {
                if (this.mode === 'strict')
                {
                    operations.push({
                        type: 'delete',
                        key,
                        actual: actualEntity,
                        reason: 'Entity not declared in strict policy'
                    });
                } else
                {
                    operations.push({
                        type: 'noop',
                        key,
                        actual: actualEntity,
                        reason: 'Orphan entity preserved by policy mode'
                    });
                }
            }
        }

        return this.buildResult(operations);
    }

    private buildResult(ops: DiffOperation<T>[]): DiffResult<T> {
        const summary = {
            create: 0,
            update: 0,
            delete: 0,
            noop: 0
        };

        for (const op of ops) {
            summary[op.type]++;
        }

        return {
            mode: this.mode,
            operations: ops,
            summary
        };
    }
}
