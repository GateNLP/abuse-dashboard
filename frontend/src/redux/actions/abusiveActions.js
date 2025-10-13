export const getAbusiveOverview = (query, filter, from, to) => {
    return{
        type : "GET_ABUSIVE_OVERVIEW",
        payload : {
            query: query || "",
            filter: filter || {},
            from: from,
            to: to
        }
    };
}

export const setAbusiveOverview = (abusive) => {
    return{
        type : "SET_ABUSIVE_OVERVIEW",
        payload : {
            abusive : abusive,
        }
    };
}

export const setAbusiveTriggers = (triggers) => {
    return{
        type : "SET_ABUSIVE_TRIGGERS",
        payload : {
            triggers: triggers,
        }
    };
}

export const getAbusiveTriggers = (query, filter, from, to, threshold) => {
    return{
        type : "GET_ABUSIVE_TRIGGERS",
        payload : {
            query: query || "",
            filter: filter || {},
            from: from,
            to: to
        }
    };
}

export const setAbusiveStatus = (loading, done, failed) => {
    return {
        type: "SET_ABUSIVE_STATUS",
        payload: {
            loading: loading,
            done: done,
            failed: failed
        }
    }
}