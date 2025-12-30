import { Octokit } from "@octokit/rest";
import { log } from "../utils/logger";
import { LabelEntity } from "../engine/types/labels";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN not set in environment");
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

export async function fetchCurrentLabels(owner?: string, repo?: string): Promise<LabelEntity[]> {
    const repoOwner = owner ?? process.env.GITHUB_REPOSITORY?.split("/")[0];
    const repoName = repo ?? process.env.GITHUB_REPOSITORY?.split("/")[1];

    if (!repoOwner || !repoName) {
        throw new Error("Cannot determine repository owner or name from environment");
    }

    const labels: LabelEntity[] = [];
    let page = 1;
    const per_page = 100;

    while (true) {
        const response = await octokit.issues.listLabelsForRepo({
            owner: repoOwner,
            repo: repoName,
            per_page,
            page
        });

        for (const l of response.data) {
            labels.push({
                key: l.name,
                name: l.name,
                color: l.color,
                description: l.description ?? undefined,
                hash() {
                    return `${this.color}|${this.description ?? ""}`;
                }
            });
        }

        if (response.data.length < per_page) break;
        page++;
    }

    log.info(`Fetched ${labels.length} labels from ${repoOwner}/${repoName}`);
    return labels;
}


export async function createLabel(label: LabelEntity, owner?: string, repo?: string) {
    const [repoOwner, repoName] = getRepo(owner, repo);
    await octokit.issues.createLabel({
        owner: repoOwner,
        repo: repoName,
        name: label.name,
        color: label.color,
        description: label.description
    });
    log.info(`Created label ${label.key}`);
}

export async function updateLabel(label: LabelEntity, owner?: string, repo?: string) {
    const [repoOwner, repoName] = getRepo(owner, repo);
    await octokit.issues.updateLabel({
        owner: repoOwner,
        repo: repoName,
        name: label.key,
        new_name: label.name,
        color: label.color,
        description: label.description
    });
    log.info(`Updated label ${label.key}`);
}

export async function deleteLabel(key: string, owner?: string, repo?: string) {
    const [repoOwner, repoName] = getRepo(owner, repo);
    await octokit.issues.deleteLabel({
        owner: repoOwner,
        repo: repoName,
        name: key
    });
    log.info(`Deleted label ${key}`);
}

function getRepo(owner?: string, repo?: string): [string, string]
{
    const repoOwner = owner ?? process.env.GITHUB_REPOSITORY?.split("/")[0];
    const repoName = repo ?? process.env.GITHUB_REPOSITORY?.split("/")[1];

    if (!repoOwner || !repoName) {
        throw new Error("Cannot determine repository owner or name from environment");
    }
    return [repoOwner, repoName];
}
