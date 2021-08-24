import * as cache from "@actions/cache";
import * as core from "@actions/core";
import path from "path";

import { Events, Inputs, State } from "./constants";
import * as utils from "./utils/actionUtils";

// Catch and log any unhandled exceptions.  These exceptions can leak out of the uploadChunk method in
// @actions/toolkit when a failed upload closes the file descriptor causing any in-process reads to
// throw an uncaught exception.  Instead of failing this action, just warn.
process.on("uncaughtException", e => utils.logWarning(e.message));

async function run(): Promise<void> {
    try {
        if (utils.isGhes()) {
            utils.logWarning(
                "Cache action is not supported on GHES. See https://github.com/actions/cache/issues/505 for more details"
            );
            return;
        }

        if (!utils.isValidEvent()) {
            utils.logWarning(
                // eslint-disable-next-line prettier/prettier
                `Event Validation Error: The event type ${process.env[Events.Key]
                } is not supported because it's not tied to a branch or tag ref.`
            );
            return;
        }

        const state = utils.getCacheState();

        const ruleTarget = core.getInput(Inputs.Rule);

        // Inputs are re-evaluted before the post action, so we want the original key used for restore
        const primaryKey = core.getState(State.CachePrimaryKey);
        if (!primaryKey) {
            utils.logWarning(`Error retrieving key from state.`);
            return;
        }

        if (utils.isExactKeyMatch(primaryKey, state)) {
            core.info(
                `Cache hit occurred on the primary key ${primaryKey}, not saving cache.`
            );
            return;
        }

        const makefile = core.getInput(Inputs.Makefile) || "Makefile";
        const dirname = path.dirname(makefile);
        const cacheTarget = path.join(dirname, ruleTarget);

        core.info(`Target: ${cacheTarget}`);

        try {
            await cache.saveCache([cacheTarget], primaryKey, {
                uploadChunkSize: utils.getInputAsInt(Inputs.UploadChunkSize)
            });
            core.info(`Cache saved with key: ${primaryKey}`);
        } catch (error) {
            if (error instanceof Error) {
                if (error.name === cache.ValidationError.name) {
                    throw error;
                } else if (error.name === cache.ReserveCacheError.name) {
                    core.info(error.message);
                } else {
                    utils.logWarning(error.message);
                }
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            utils.logWarning(error.message);
        }
    }
}

run();

export default run;
