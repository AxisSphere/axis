import {DiffableEntity} from "../diff/PolicyDiffEngine";

export interface Label {
    color: string;
    description?: string;
}

export interface LabelPolicy {
    version: number;
    labels: Record<string, Label>;
}

export interface Policy {
    labels?: LabelPolicy;
    // branches?: BranchPolicy;
    // pullRequests?: PullRequestPolicy;
}

export interface LabelEntity extends DiffableEntity {
    key: string;
    name: string;
    color: string;
    description?: string;

    hash(): string;
}

export function createLabelEntity(data: {
    key: string;
    name?: string;
    color: string;
    description?: string;
}): LabelEntity {
    return {
        key: data.key,
        name: data.name ?? data.key,
        color: data.color,
        description: data.description,
        hash() {
            return `${this.color}|${this.description ?? ""}`;
        }
    };
}
