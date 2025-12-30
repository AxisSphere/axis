import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { log } from "../utils/logger";
import { Policy, LabelPolicy, createLabelEntity, LabelEntity } from "../engine/types/labels";

const DEFAULT_POLICIES_DIR = path.resolve(__dirname, "../default-policies");

async function loadPolicyFile(fileName: string): Promise<Policy> {
    const repoPath = path.join(process.cwd(), "policies", `${fileName}.yml`);
    const defaultPath = path.join(DEFAULT_POLICIES_DIR, `${fileName}.yml`);

    let content: string;
    try {
        content = await fs.readFile(repoPath, "utf-8");
        log.info(`Loaded policy override from repo: ${repoPath}`);
    } catch {
        try {
            content = await fs.readFile(defaultPath, "utf-8");
            log.info(`Loaded default policy: ${defaultPath}`);
        } catch (err) {
            log.error(`Policy file not found: ${fileName} (repo or default)`);
            throw err;
        }
    }

    return yaml.load(content) as Policy;
}

export async function loadPolicies(names: string[]): Promise<Policy> {
    const combined: Policy = {};

    for (const name of names) {
        const policy = await loadPolicyFile(name);

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

export function policyToEntities(policy: LabelPolicy): LabelEntity[] {
    return Object.entries(policy.labels).map(([key, value]) =>
        createLabelEntity({
            key,
            color: value.color,
            description: value.description,
        })
    );
}
