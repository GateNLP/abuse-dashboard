const defaultState = {
    query: "",
    totals: null,
    users: null,
    terms: null,
    compliance: null,
    loading: false,
    done: false,
    failed: false,
    flashType: null,
    flashMessage: null
};

const userSearchReducer = (state = defaultState, action) => {
    switch (action.type) {
        case "SET_USER_SEARCH_QUERY":
            // if we have a new query then start a clean state
            state = defaultState;
        // eslint-disable-next-line
        case "SET_USER_SEARCH_LOADING":
        case "SET_USER_SEARCH_RESPONSE":
        case "SET_USER_SEARCH_FLASH":
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
export default userSearchReducer;