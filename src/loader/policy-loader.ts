import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import {log} from "../utils/logger";
import {createLabelEntity, LabelPolicy, Policy} from "../engine/types/labels";

const DEFAULT_POLICIES_DIR = path.resolve(__dirname, "../../default-policies");

async function loadPolicyFile(fileName: string): Promise<Policy> {
    const repoPath = path.join(process.cwd(), "policies", `${fileName}.yml`);
    const defaultPath = path.join(DEFAULT_POLICIES_DIR, `${fileName}.yml`);

    try {
        let content: string;
        try {
            content = await fs.readFile(repoPath, "utf-8");
            log.info(`Loaded policy override from repo: ${repoPath}`);
        } catch {
            content = await fs.readFile(defaultPath, "utf-8");
            log.info(`Loaded default policy: ${defaultPath}`);
        }

        return yaml.load(content) as Policy;
    } catch (err) {
        log.error(`Failed to load policy file ${fileName}: ${(err as Error).message}`);
        throw err;
    }
}

/**
 * Load multiple policy files by name (without extension)
 * e.g. ['labels', 'branches']
 */
export async function loadPolicies(names: string[]): Promise<Policy> {
    const combined: Policy = {};

    for (const name of names) {
        const policy = await loadPolicyFile(name);

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
