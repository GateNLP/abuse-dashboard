const defaultState = {
    jobID: null,
    status: "",
    query: null,
    filter: {
        authors: [],
        mentions: [],
        hashtags: [],
        languages: [],
    },
    loading: false,
    done: false,
    failed: false,
    flashType: null,
    flashMessage: null,
    graph: null,
    data: null
};

const coordinationReducer = (state = defaultState, action) => {
    switch (action.type) {
        case "FORGET_COORDINATION":
        case "REQUEST_COORDINATION":
            state = defaultState;
        case "SET_COORDINATION_STATUS":
        case "SET_COORDINATION_GRAPH":
        // eslint-disable-next-line
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
export default coordinationReducer;