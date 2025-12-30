export interface Label {
    color: string;
    description: string;
}

export interface LabelsPolicy {
    labels: Record<string, Label>;
}