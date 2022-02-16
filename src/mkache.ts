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

    const makefileDir = path.relative(".", path.dirname(makefile));

    const cacheTarget = path.relative(".", path.join(makefileDir, ruleTarget));
    core.info(`Target to cache: ${cacheTarget}`);

    const cmd = `cd ${makefileDir} && make -f ${path.basename(
        makefile
    )} -pn ${ruleTarget}`;
    core.info("Running: " + cmd);
    const raw = execSync(cmd).toString("utf-8");

    const matches = raw.match(ruleRegexp(ruleTarget));
    if (!matches?.length || matches.length < 2) {
        throw new Error("rule not found");
    }

    const sources = matches[1]
        .trim()
        .split(/\s+/)
        .map(src => path.relative(".", path.join(makefileDir, src)))
        .sort((a, b) => a.localeCompare(b));
    if (!sources.length) {
        throw new Error(`no sources`);
    }
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
