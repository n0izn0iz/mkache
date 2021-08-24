import * as cache from "@actions/cache";
import * as core from "@actions/core";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";
import child_process from "child_process"

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
                `Event Validation Error: The event type ${process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const makefileDir = core.getInput(Inputs.Makefile)
        const ruleTarget = core.getInput(Inputs.Rule)

        const primKeyBuf = child_process.execSync(`cd ${makefileDir} && cat $(make -pn ${ruleTarget} 2>/dev/null | grep "${ruleTarget}: " | cut -d: -f2) | shasum | cut -d' ' -f1`)
        const hash = primKeyBuf.toString("utf-8")

        const primaryKey = core.getInput(Inputs.Key, { required: true }) + "-" + hash;
        core.saveState(State.CachePrimaryKey, primaryKey);

        const restoreKeys = [];
        const cachePaths = [ruleTarget];

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

            child_process.execSync(`touch ${ruleTarget}`)

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
