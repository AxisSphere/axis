import { IPolicyAdapter } from "../adapters/interfaces";
import { log } from "../utils/logger";

export class Engine {
    private adapters: IPolicyAdapter<any>[] = [];

    constructor() {}

    registerAdapter(adapter: IPolicyAdapter<any>) {
        this.adapters.push(adapter);
    }

    async run(policyNames: string[], policyLoader: (name: string) => any) {
        for (const policyName of policyNames) {
            log.info(`Applying policy: ${policyName}`);
            const policy = policyLoader(policyName);

            for (const adapter of this.adapters) {
                if (adapter.supports(policy)) {
                    await adapter.apply(policy);
                }
            }
        }
    }
}
