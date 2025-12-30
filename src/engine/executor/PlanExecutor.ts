import { ExecutionPlan, PlannedStep } from "../diff/DiffPlannerTypes";
import { log } from "../../utils/logger";
import {DiffableEntity} from "../diff/PolicyDiffEngine";

export class PlanExecutor<T extends DiffableEntity> {
    constructor(
        private readonly dryRun: boolean = false
    ) {}

    async execute(plan: ExecutionPlan<T>) {
        log.info(`Executing plan (${plan.steps.length} steps, mode=${plan.mode})`);

        for (const step of plan.steps) {
            await this.executeStep(step);
        }

        log.info("Execution finished");
    }

    private async executeStep(step: PlannedStep<T>)
    {
        const{ type, key, desired, actual, reason, safe } = step;

        if (!safe && !this.dryRun) {
            log.warn(`[DANGEROUS] Skipping unsafe operation: ${type} ${key} (${reason})`);
            return;
        }

        const actionMsg = `${type.toUpperCase()} ${key} ${this.dryRun ? '(dry-run)' : ''}`;
        log.info(`${actionMsg} - ${reason}`);

        if (this.dryRun) return;

      
        switch (type) {
            case "create":
                await this.create(desired!);
                break;
            case "update":
                await this.update(desired!, actual!);
                break;
            case "delete":
                await this.delete(key);
                break;
            case "noop":
                break;
            default:
                throw new Error(`Unknown operation type: ${type}`);
        }
    }

    // ---------------------------
    // GitHub API or other executor
    // ---------------------------
    private async create(entity: T) {
        log.info(`API CREATE -> ${entity.key}`);
    }

    private async update(entity: T, actual: T) {
        log.info(`API UPDATE -> ${entity.key}`);
    }

    private async delete(key: string) {
        log.info(`API DELETE -> ${key}`);
    }
}
