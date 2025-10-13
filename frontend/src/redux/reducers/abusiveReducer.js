const defaultState = {
    abusive: null,
    triggers: null,
    done: false,
    loading: false,
    failed: false
};

const abusiveReducer = (state = defaultState, action) => {
    switch (action.type) {
        case "GET_ABUSIVE_OVERVIEW":
        case "SET_ABUSIVE_OVERVIEW":
        case "GET_ABUSIVE_TRIGGERS":
        case "SET_ABUSIVE_TRIGGERS":
        case "SET_ABUSIVE_STATUS":
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
export default abusiveReducer;