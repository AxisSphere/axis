import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { log } from "../utils/logger";
import { Policy, LabelPolicy, createLabelEntity, LabelEntity } from "../engine/types/labels";

// Poprawiona logika ścieżki - fallback chain
function getDefaultPoliciesDir(): string {
    // 1. GitHub Action path (gdy działa w akcji)
    if (process.env.GITHUB_ACTION_PATH) {
        return path.join(process.env.GITHUB_ACTION_PATH, "default-policies");
    }

    // 2. Relative to dist (gdy jest zbudowane lokalnie)
    const distPath = path.join(__dirname, "..", "..", "default-policies");

    // 3. Relative to src (development)
    const srcPath = path.join(__dirname, "..", "..", "default-policies");

    return distPath; // preferuj dist
}

const DEFAULT_POLICIES_DIR = getDefaultPoliciesDir();

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function loadPolicyFile(fileName: string): Promise<Policy> {
    // Sprawdzaj w kolejności: repo -> default -> error
    const repoPath = path.join(process.cwd(), "policies", `${fileName}.yml`);
    const defaultPath = path.join(DEFAULT_POLICIES_DIR, `${fileName}.yml`);

    log.debug(`Looking for policy: ${fileName}`);
    log.debug(`  Repo path: ${repoPath}`);
    log.debug(`  Default path: ${defaultPath}`);

    // Próba #1: Repo override
    if (await fileExists(repoPath)) {
        try {
            const content = await fs.readFile(repoPath, "utf-8");
            log.info(`✓ Loaded policy override from repo: ${fileName}`);
            return yaml.load(content) as Policy;
        } catch (err) {
            log.error(`Failed to parse repo policy ${fileName}:`);
            throw err;
        }
    }

    // Próba #2: Default policy
    if (await fileExists(defaultPath)) {
        try {
            const content = await fs.readFile(defaultPath, "utf-8");
            log.info(`✓ Loaded default policy: ${fileName}`);
            return yaml.load(content) as Policy;
        } catch (err) {
            log.error(`Failed to parse default policy ${fileName}:`);
            throw err;
        }
    }

    // Próba #3: Brak pliku - błąd
    log.error(`✗ Policy file not found: ${fileName}`);
    log.error(`  Checked paths:`);
    log.error(`    - ${repoPath}`);
    log.error(`    - ${defaultPath}`);

    throw new Error(
        `Policy file not found: ${fileName}.yml\n` +
        `Expected in: ${repoPath} or ${defaultPath}`
    );
}

export async function loadPolicies(names: string[]): Promise<Policy> {
    const combined: Policy = {};

    log.info(`Loading ${names.length} policy file(s): ${names.join(", ")}`);

    for (const name of names) {
        try {
            const policy = await loadPolicyFile(name);

            // Merge labels policy
            if (policy.labels) {
                if (!combined.labels) {
                    combined.labels = {
                        version: policy.labels.version || 1,
                        labels: {},
                    };
                }

                // Merge labels z zachowaniem kolejności
                combined.labels.labels = {
                    ...(combined.labels.labels ?? {}),
                    ...policy.labels.labels,
                };

                log.info(`  Merged ${Object.keys(policy.labels.labels).length} labels from ${name}`);
            }

            // Tu możesz dodać inne typy polityk (branches, workflows, etc)
            // if (policy.branches) { ... }

        } catch (err) {
            log.error(`Failed to load policy: ${name}`);
            throw err;
        }
    }

    // Walidacja wyniku
    if (!combined.labels || Object.keys(combined.labels.labels).length === 0) {
        log.warn("No labels loaded from any policy!");
    } else {
        log.info(`✓ Total labels loaded: ${Object.keys(combined.labels.labels).length}`);
    }

    return combined;
}

export function policyToEntities(policy: LabelPolicy): LabelEntity[] {
    if (!policy || !policy.labels) {
        log.warn("Empty policy provided to policyToEntities");
        return [];
    }

    const entities = Object.entries(policy.labels).map(([key, value]) => {
        // Walidacja wymaganych pól
        if (!value.color) {
            log.warn(`Label "${key}" missing color, skipping`);
            return null;
        }

        return createLabelEntity({
            key,
            color: value.color,
            description: value.description || "", // fallback to empty string
        });
    }).filter((entity): entity is LabelEntity => entity !== null);

    log.debug(`Converted ${entities.length} policy entries to entities`);
    return entities;
}

// Helper do debugowania
export async function validatePolicyStructure(policy: Policy): Promise<boolean> {
    let valid = true;

    if (policy.labels) {
        const { version, labels } = policy.labels;

        if (!version || typeof version !== 'number') {
            log.error("Invalid labels.version - must be a number");
            valid = false;
        }

        if (!labels || typeof labels !== 'object') {
            log.error("Invalid labels.labels - must be an object");
            valid = false;
        }

        for (const [key, value] of Object.entries(labels)) {
            if (!value.color) {
                log.error(`Label "${key}" missing required field: color`);
                valid = false;
            }
            if (!/^[0-9a-fA-F]{6}$/.test(value.color)) {
                log.warn(`Label "${key}" has invalid color format: ${value.color} (expected 6-digit hex)`);
            }
        }
    }

    return valid;
}