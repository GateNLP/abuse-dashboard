
export const setSummary = (summary, loading, done, failed) => {
    return {
        type: "SET_SUMMARY",
        payload: {
            summary: summary,
            loading: loading,
            done: done,
            failed: failed,
        }
    };
}

export const getSummary = (query, filter, from, to) => {
    return {
        type: "GET_SUMMARY",
        payload: {
            query: query || "",
            filter: filter || {},
            from: from,
            to: to
        }
    };
}


export const setSummaryLoading = (loading) => {
    return {
        type: "SET_SUMMARY_LOADING",
        payload: {
            loading: loading,
        }
    };
}

export const setSummaryFailed = (failed) => {
    return {
        type: "SET_SUMMARY_FAILED",
        payload: {
            failed: failed,
        }
    };
}