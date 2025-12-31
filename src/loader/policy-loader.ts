import fs from "fs/promises";
import path from "path";
import yaml from "js-yaml";
import { log } from "../utils/logger";
import { Policy, LabelPolicy, createLabelEntity, LabelEntity } from "../engine/types/labels";

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

function getPolicySearchPaths(fileName: string): string[] {
    const paths: string[] = [];

    // 1. Repo override (najwyższy priorytet)
    paths.push(path.join(process.cwd(), "policies", `${fileName}.yml`));
    paths.push(path.join(process.cwd(), ".github", "policies", `${fileName}.yml`));

    // 2. Default policies bundled z akcją
    if (process.env.GITHUB_ACTION_PATH) {
        // W środowisku GitHub Actions
        paths.push(path.join(process.env.GITHUB_ACTION_PATH, "default-policies", `${fileName}.yml`));
    }

    // 3. Relative paths (development & różne bundlers)
    // Jeśli używasz ncc, pliki będą w dist/default-policies
    paths.push(path.join(__dirname, "..", "default-policies", `${fileName}.yml`));
    paths.push(path.join(__dirname, "..", "..", "default-policies", `${fileName}.yml`));
    paths.push(path.join(__dirname, "default-policies", `${fileName}.yml`));

    // 4. Absolute fallback (jeśli wszystko inne zawiedzie)
    const actionPath = process.env.GITHUB_ACTION_PATH;
    if (actionPath) {
        // Czasami GITHUB_ACTION_PATH wskazuje na src/, nie root
        const parentPath = path.dirname(actionPath);
        paths.push(path.join(parentPath, "default-policies", `${fileName}.yml`));
    }

    return paths;
}

async function loadPolicyFile(fileName: string): Promise<Policy> {
    const searchPaths = getPolicySearchPaths(fileName);

    log.debug(`Searching for policy: ${fileName}`);

    // Loguj wszystkie sprawdzane ścieżki (pomocne przy debugowaniu)
    for (const searchPath of searchPaths) {
        log.debug(`  Checking: ${searchPath}`);
    }

    // Szukaj pierwszego istniejącego pliku
    for (const filePath of searchPaths) {
        if (await fileExists(filePath)) {
            try {
                const content = await fs.readFile(filePath, "utf-8");
                const policy = yaml.load(content) as Policy;

                // Określ skąd załadowano
                const source = filePath.includes(process.cwd()) ? "repo" : "default";
                log.info(`✓ Loaded ${source} policy: ${fileName} (${filePath})`);

                return policy;
            } catch (err) {
                log.error(`Failed to parse policy file: ${filePath}`);
                throw new Error(`Invalid YAML in ${filePath}: ${err}`);
            }
        }
    }

    // Żaden plik nie istnieje
    log.error(`✗ Policy file not found: ${fileName}.yml`);
    log.error(`Searched paths:`);
    searchPaths.forEach(p => log.error(`  - ${p}`));

    throw new Error(
        `Policy "${fileName}.yml" not found.\n` +
        `Create one of these files:\n` +
        `  - ${process.cwd()}/policies/${fileName}.yml\n` +
        `  - ${process.cwd()}/.github/policies/${fileName}.yml\n` +
        `Or ensure default-policies/ is bundled with the action.`
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

                const labelCount = Object.keys(policy.labels.labels).length;
                log.info(`  ✓ Merged ${labelCount} label(s) from ${name}`);
            }

            // TODO: Inne typy polityk (branches, workflows, etc)

        } catch (err) {
            log.error(`Failed to load policy: ${name}`);
            throw err;
        }
    }

    // Walidacja wyniku
    if (!combined.labels || Object.keys(combined.labels.labels).length === 0) {
        log.warn("⚠ No labels loaded from any policy!");
    } else {
        const totalLabels = Object.keys(combined.labels.labels).length;
        log.info(`✓ Total labels loaded: ${totalLabels}`);
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

        // Normalizacja koloru (usuń # jeśli jest)
        const color = value.color.replace(/^#/, '');

        // Walidacja formatu koloru
        if (!/^[0-9a-fA-F]{6}$/.test(color)) {
            log.warn(`Label "${key}" has invalid color format: ${value.color} (expected 6-digit hex)`);
            return null;
        }

        return createLabelEntity({
            key,
            color,
            description: value.description || "",
        });
    }).filter((entity): entity is LabelEntity => entity !== null);

    log.debug(`Converted ${entities.length} policy entries to entities`);
    return entities;
}

// Helper do walidacji struktury policy
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
            const color = value.color.replace(/^#/, '');
            if (!/^[0-9a-fA-F]{6}$/.test(color)) {
                log.warn(`Label "${key}" has invalid color format: ${value.color}`);
            }
        }
    }

    return valid;
}

// Debug helper - wyświetl wszystkie sprawdzane ścieżki
export function debugPolicyPaths(fileName: string): void {
    const paths = getPolicySearchPaths(fileName);
    console.log("\n=== POLICY DEBUG ===");
    console.log(`Looking for: ${fileName}.yml`);
    console.log(`__dirname: ${__dirname}`);
    console.log(`process.cwd(): ${process.cwd()}`);
    console.log(`GITHUB_ACTION_PATH: ${process.env.GITHUB_ACTION_PATH || 'undefined'}`);
    console.log("\nSearch paths:");
    paths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));
    console.log("===================\n");
}