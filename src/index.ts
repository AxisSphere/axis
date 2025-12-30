import { Octokit } from "@octokit/rest";
import { Engine } from "./engine/engine";
import { LabelsAdapter } from "./adapters/labels.adapter";
import { loadPolicy } from "./policies/loader";
import { log } from "./utils/logger";

async function main() {
    try {
        const token = process.env.GITHUB_TOKEN;
        if (!token) throw new Error("GITHUB_TOKEN not set");

        const repoFull = process.env.GITHUB_REPOSITORY;
        if (!repoFull) throw new Error("GITHUB_REPOSITORY not set");

        const [owner, repo] = repoFull.split("/");

        const octokit = new Octokit({ auth: token });

        const engine = new Engine();
        engine.registerAdapter(new LabelsAdapter(octokit, owner, repo));

        await engine.run(["labels"], loadPolicy);

        log.info("All policies applied successfully");
    } catch (err: any) {
        log.error(err.message || String(err));
        process.exit(1);
    }
}

main();
