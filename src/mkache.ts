import * as core from "@actions/core";
import { execSync } from "child_process";
import path from "path";

import { Inputs } from "./constants";

const shaAlgo = "256";

const cacheVersion = "4";

const ruleRegexp = (ruleTarget: string): RegExp =>
    new RegExp(`^${ruleTarget}:(.*)$`, "m");

export async function getInfo(): Promise<{
    key: string;
    cacheTarget: string;
}> {
    const ruleTarget = core.getInput(Inputs.Rule, { required: true });
    const targetKey = core.getInput(Inputs.Key, {
        required: true
    });
    const makefile = path.relative(
        ".",
        core.getInput(Inputs.Makefile) || "Makefile"
    );

    const workDir = path.relative(".", path.dirname(makefile));
    core.info(`Working directory: ${workDir}`);

    const cacheTarget = path.relative(".", path.join(workDir, ruleTarget));
    core.info(`Target to cache: ${cacheTarget}`);

    const cmd = `make -f ${makefile} -pn ${ruleTarget}`;
    core.info("Running: " + cmd);
    const raw = execSync(cmd).toString("utf-8");

    const matches = raw.match(ruleRegexp(ruleTarget));
    if (!matches?.length || matches.length < 2) {
        throw new Error("rule not found");
    }

    const sources = matches[1]
        .trim()
        .split(/\s+/)
        .sort((a, b) => a.localeCompare(b));
    core.info(`Sources: ${sources}`);

    const hashes = await Promise.all(
        sources.map(async source =>
            execSync(`shasum -a ${shaAlgo} ${source}`).toString("utf-8")
        )
    );

    const sourcesHash = execSync(`shasum -a ${shaAlgo}`, {
        input: hashes.join("\n")
    })
        .toString("utf-8")
        .split(/\s+/)[0]
        .trim();

    core.info(`Sources hash: ${sourcesHash}`);

    const key = `mkache-v${cacheVersion}-${targetKey}-${sourcesHash}`;

    core.info(`Key: ${key}`);

    return { key, cacheTarget };
}
