import { loadPolicies, policyToEntities } from "./loader/policy-loader";
import { fetchCurrentLabels } from "./github/labels-client";
import { PolicyDiffEngine } from "./engine/diff/PolicyDiffEngine";
import { DiffPlanner } from "./engine/diff/DiffPlanner";
import { PlanExecutor } from "./engine/executor/PlanExecutor";
import { PolicyMode } from "./engine/types/mode";
import { log } from "./utils/logger";
import { LabelEntity } from "./engine/types/labels";

export async function runAxisEngine(opts: {
    policies: string[];
    mode: PolicyMode;
    dryRun?: boolean;
}) {
    log.info(`Axis Engine starting (mode=${opts.mode})`);

    const policy = await loadPolicies(opts.policies);
    if (!policy.labels) {
        log.warn("No labels policy found");
        return;
    }

    const desiredEntities = policyToEntities(policy.labels);
    const currentRecord = await fetchCurrentLabels();
    const actualEntities = Object.values(currentRecord);

    const diffEngine = new PolicyDiffEngine<LabelEntity>(opts.mode);
    const diff = diffEngine.diff(desiredEntities, actualEntities);

    const planner = new DiffPlanner<LabelEntity>(opts.mode);
    const plan = planner.plan(diff);

    log.info(`Execution plan: ${plan.steps.length} steps`);

    const executor = new PlanExecutor<LabelEntity>(opts.dryRun ?? false);
    await executor.execute(plan);

    log.info("Axis Engine finished");
}
