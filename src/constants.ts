export enum Inputs {
    Rule = "rule",
    Makefile = "makefile",
    Key = "key",
    UploadChunkSize = "upload-chunk-size"
}

export enum Outputs {
    CacheHit = "cache-hit"
}

export enum State {
    CacheTarget = "path",
    CachePrimaryKey = "CACHE_KEY",
    CacheMatchedKey = "CACHE_RESULT"
}

export enum Events {
    Key = "GITHUB_EVENT_NAME",
    Push = "push",
    PullRequest = "pull_request"
}

export const RefKey = "GITHUB_REF";
