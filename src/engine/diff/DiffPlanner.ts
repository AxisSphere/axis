import {
    DiffResult,
    DiffOperation,
    PolicyMode
} from './DiffTypes';

import {
    ExecutionPlan,
    PlannedStep
} from './DiffPlannerTypes';

const EXECUTION_ORDER: Record<string, number> = {
    create: 1,
    update: 2,
    delete: 3,
    noop: 99
};

export class DiffPlanner<T>
{
    constructor(
        private readonly mode: PolicyMode
    ) {}

    plan(diff: DiffResult<T>): ExecutionPlan<T>
    {
        const steps: PlannedStep<T>[] = [];
        let order = 0;

        const executableOps = diff.operations
            .filter(op => this.isExecutable(op))
            .sort((a, b) =>
                EXECUTION_ORDER[a.type] - EXECUTION_ORDER[b.type]
            );

        for (const op of executableOps)
        {
            steps.push({
                order: ++order,
                type: op.type,
                key: op.key,
                desired: op.desired,
                actual: op.actual,
                reason: op.reason,
                safe: this.isSafe(op)
            });
        }

        return {
            mode: this.mode,
            steps,
            summary: {
                executable: steps.length,
                skipped: diff.operations.length - steps.length,
                dangerous: steps.filter(s => !s.safe).length
            }
        };
    }

    private isExecutable(op: DiffOperation<T>): boolean
    {
        if (op.type === 'noop') return false;

        if (this.mode === 'additive') {
            return op.type === 'create';
        }

        if (this.mode === 'reconcile') {
            return op.type === 'create' || op.type === 'update';
        }

        return this.mode === 'strict';
    }

    private isSafe(op: DiffOperation<T>): boolean
    {
        if (op.type === 'delete') return false;
        return !(op.type === 'update' && this.mode === 'additive');
    }
}
