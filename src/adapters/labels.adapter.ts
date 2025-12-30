import { Octokit } from "@octokit/rest";
import { LabelsPolicy } from "../engine/types/labels";
import { IPolicyAdapter } from "./interfaces";
import { log } from "../utils/logger";

export class LabelsAdapter implements IPolicyAdapter<LabelsPolicy> {
    name = "labels";

    constructor(private octokit: Octokit, private owner: string, private repo: string) {}

    supports(policy: any): policy is LabelsPolicy {
        return policy && policy.labels;
    }

    async apply(policy: LabelsPolicy) {
        const existing = await this.octokit.issues.listLabelsForRepo({
            owner: this.owner,
            repo: this.repo,
            per_page: 100
        });

        const existingNames = existing.data.map(l => l.name);

        // create/update
        for (const [name, { color, description }] of Object.entries(policy.labels)) {
            if (!existingNames.includes(name)) {
                await this.octokit.issues.createLabel({ owner: this.owner, repo: this.repo, name, color, description });
                log.info(`Created label: ${name}`);
            } else {
                await this.octokit.issues.updateLabel({ owner: this.owner, repo: this.repo, name, color, description });
                log.info(`Updated label: ${name}`);
            }
        }

        // delete labels not in policy
        for (const label of existing.data) {
            if (!policy.labels[label.name]) {
                await this.octokit.issues.deleteLabel({ owner: this.owner, repo: this.repo, name: label.name });
                log.info(`Deleted label: ${label.name}`);
            }
        }
    }
}