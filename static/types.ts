
type category = "quantum shit" | "algebraic gubbins"

interface query {
    query? : string,
    sort? : "relevance" | "date",
    /** Categories to filter; outer list is AND, inner list is OR. */
    category : category[][],
    // as implemented now, start and end should be a timestamp in milliseconds since the epoch
    // see https://www.epochconverter.com/. For example 1517425200000 is Wednesday, January 31, 2018 7:00:00 PM.
    time : "3days" | "week" | "day" | "all" | "month" | "year" | {start : number, end : number},
    primaryCategory? : category
    author? : string,
    v1 : boolean
}

interface request {
    query : query,
    start_at : number,
    num_get : number,
    dyn : boolean
}

interface paper {
    title : string,
    pid
    rawpid
    category
    link
    authors : string[]
    abstract : string
    img
    tags
    published_time
    originally_published_time
    arxiv_comment
    comment
    /**In the user's library of papers. */
    in_library : boolean
}

interface response {
    /**Something to do with rendering mathjax */
    dynamic : boolean,
    /**papers.length */
    num : number
    papers : paper[]
}