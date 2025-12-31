#!/usr/bin/env node
import { runAxisEngine } from "./runner";
import { PolicyMode } from "./engine/types/mode";

const policies = process.env.POLICIES?.split(",") ?? ["labels"];
const mode = (process.env.POLICY_MODE as PolicyMode) ?? "additive";

runAxisEngine({ policies, mode, dryRun: true });