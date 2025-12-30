export interface IPolicyAdapter<TPolicy> {
    name: string;
    apply(policyData: TPolicy): Promise<void>;
    supports(policy: any): policy is TPolicy;
}