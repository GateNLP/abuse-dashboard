export const setUserSearchQuery = (query) => {
    return {
        type: "SET_USER_SEARCH_QUERY",
        payload: {
            query: query || "",
            loading: true
        }
    }
};

export const setUserSearchLoading= (loading) => {
    return {
        type: "SET_USER_SEARCH_LOADING",
        payload: {
            loading: loading,
        }
    }
}

export const setUserSearchResult = (result, loading, done, failed) => {
    return {
        type: "SET_USER_SEARCH_RESPONSE",
        payload: {
            users: result.users,
            terms: result.terms,
            compliance: result.compliance,
            totals: result.totals,
            loading: loading,
            done: done,
            failed: failed
        }
    }
}

export const setFlashMessage = (type, message) => {
    return {
        type: "SET_USER_SEARCH_FLASH",
        payload: {
            loading: false,
            flashType: type,
            flashMessage: message,
        }
    }
}