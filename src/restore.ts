import * as cache from "@actions/cache";
import * as core from "@actions/core";
import child_process from "child_process";
import path from "path";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";

async function run(): Promise<void> {
    try {
        if (utils.isGhes()) {
            utils.logWarning(
                "Cache action is not supported on GHES. See https://github.com/actions/cache/issues/505 for more details"
            );
            utils.setCacheHitOutput(false);
            return;
        }

        // Validate inputs, this can cause task failure
        if (!utils.isValidEvent()) {
            utils.logWarning(
                `Event Validation Error: The event type ${
                    process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const ruleTarget = core.getInput(Inputs.Rule);
        const makefile = core.getInput(Inputs.Makefile) || "Makefile";
        const dirname = path.dirname(makefile);

        const cacheTarget = path.join(dirname, ruleTarget);

        core.info(`Target: ${cacheTarget}`);

        const cmd = `cd ${dirname} && make -f $(basename ${makefile}) -pn ${ruleTarget} 2>/dev/null | grep "${ruleTarget}: " | cut -d: -f2`;
        core.info("Running: " + cmd);

        const deps = child_process
            .execSync(cmd)
            .toString("utf-8")
            .trim();

        core.info("Deps: " + deps);

        // FIXME: use file names and acls
        // FIXME: add makefile or even better, the rule definition, to hash

        const hash = child_process
            .execSync(`cd ${dirname} && cat ${deps} | shasum | cut -d' ' -f1`)
            .toString("utf-8");

        const primaryKey =
            "mkache_v3.0.20-" +
            core.getInput(Inputs.Key, { required: true }) +
            "-" +
            hash;
        core.saveState(State.CachePrimaryKey, primaryKey);

        const restoreKeys = [];
        const cachePaths = [cacheTarget];

        try {
            const cacheKey = await cache.restoreCache(
                cachePaths,
                primaryKey,
                restoreKeys
            );
            if (!cacheKey) {
                core.info(
                    `Cache not found for input keys: ${[
                        primaryKey,
                        ...restoreKeys
                    ].join(", ")}`
                );
                return;
            }

            // Store the matched cache key
            utils.setCacheState(cacheKey);

            const isExactKeyMatch = utils.isExactKeyMatch(primaryKey, cacheKey);
            utils.setCacheHitOutput(isExactKeyMatch);

            child_process.execSync(`touch ${cacheTarget}`);

            core.info(`Cache restored from key: ${cacheKey}`);
        } catch (error) {
            if (error.name === cache.ValidationError.name) {
                throw error;
            } else {
                utils.logWarning(error.message);
                utils.setCacheHitOutput(false);
            }
        }
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();

export default run;
