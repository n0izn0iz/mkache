export enum Inputs {
    Rule = "rule",
    UploadChunkSize = "upload-chunk-size",
    Makefile = "makefile",
    Key = "key"
}

export enum Outputs {
    CacheHit = "cache-hit"
}

export enum State {
    CachePrimaryKey = "CACHE_KEY",
    CacheMatchedKey = "CACHE_RESULT"
}

export enum Events {
    Key = "GITHUB_EVENT_NAME",
    Push = "push",
    PullRequest = "pull_request"
}

export const RefKey = "GITHUB_REF";
