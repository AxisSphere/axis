import fs from "fs";
import path from "path";
import yaml from "js-yaml";

export function loadPolicy(policyName: string): any {
    const policyPath = path.resolve(process.cwd(), "policies", `${policyName}.yml`);
    if (!fs.existsSync(policyPath)) {
        throw new Error(`Policy file not found: ${policyPath}`);
    }

    const raw = fs.readFileSync(policyPath, "utf8");
    return yaml.load(raw);
}
