
export const setDatasetDecay = (decay, loading, done, failed) => {
    return {
        type: "SET_DATASET_DECAY",
        payload: {
            decay: decay,
            loading: loading,
            done: done,
            failed: failed
        }
    };
}

export const getDatasetDecay = (query, filter, from, to) => {
    return {
        type: "GET_DATASET_DECAY",
        payload: {
            query: query || "",
            filter: filter || {},
            from: from,
            to: to
        }
    };
}


export const setDatasetDecayLoading = (loading) => {
    return {
        type: "SET_DATASET_DECAY_LOADING",
        payload: {
            loading: loading,
        }
    };
}

export const setEngagementFailed = (failed) => {
    return {
        type: "SET_DATASET_DECAY_ERROR",
        payload: {
            failed: failed,
        }
    };
}