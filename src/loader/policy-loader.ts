import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { log } from "../utils/logger";
import {Policy, LabelPolicy, LabelEntity, createLabelEntity} from "../engine/types/labels";

/**
 * Load a single policy file (YAML)
 */
async function loadPolicyFile(filePath: string): Promise<Policy> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        const parsed = yaml.load(content) as Policy;
        log.info(`Loaded policy file: ${filePath}`);
        return parsed;
    } catch (err) {
        log.error(`Failed to load policy file: ${filePath} - ${(err as Error).message}`);
        throw err;
    }
}

/**
 * Load multiple policy files by name (without extension)
 * e.g. ['labels', 'branches']
 */
export async function loadPolicies(names: string[]): Promise<Policy>
{
    const baseDir = path.resolve(process.cwd(), "policies");
    const combined: Policy = {};

    for (const name of names)
    {
        const filePath = path.join(baseDir, `${name}.yml`);
        const policy = await loadPolicyFile(filePath);

        // Merge labels
        if (policy.labels) {
            combined.labels = {
                version: policy.labels.version,
                labels: {
                    ...(combined.labels?.labels ?? {}),
                    ...policy.labels.labels,
                },
            };
        }
    }

    return combined;
}

/**
 * Convert LabelPolicy to LabelEntity[]
 */
export function policyToEntities(policy: LabelPolicy) {
    return Object.entries(policy.labels).map(([key, value]) =>
        createLabelEntity({
            key,
            color: value.color,
            description: value.description
        })
    );
}
