import * as cache from "@actions/cache";
import * as core from "@actions/core";
import { execSync } from "child_process";

import { Events, Inputs, State } from "./constants";
import * as mkache from "./mkache";
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

        const { key: primaryKey, cacheTarget } = await mkache.getInfo();
        core.saveState(State.CachePrimaryKey, primaryKey);
        core.saveState(State.CacheTarget, cacheTarget);

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

            execSync(`touch ${cacheTarget}`);

            core.info(`Cache restored from key: ${cacheKey}`);
        } catch (error) {
            if ((error as Error).name === cache.ValidationError.name) {
                throw error;
            } else {
                utils.logWarning((error as Error).message);
                utils.setCacheHitOutput(false);
            }
        }
    } catch (error) {
        core.setFailed((error as Error).message);
    }
}

run();

export default run;
