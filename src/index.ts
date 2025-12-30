#!/usr/bin/env node
import { runAxisEngine } from "./runAxisEngine";
import { PolicyMode } from "./engine/types/mode";

const policies = process.env.POLICIES?.split(",") ?? ["labels"];
const mode = (process.env.MODE as PolicyMode) ?? "additive";

runAxisEngine({ policies, mode, dryRun: false });
