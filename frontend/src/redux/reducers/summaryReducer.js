const defaultState = {
    summary: null,
    done: false,
    loading: false,
    failed: false
};

const summaryReducer = (state = defaultState, action) => {
    switch (action.type) {
        case "GET_SUMMARY":
        case "SET_SUMMARY":
        case "SET_SUMMARY_LOADING":
        case "SET_SUMMARY_FAILED":
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
export default summaryReducer;