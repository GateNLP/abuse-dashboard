const defaultState = {
    alerts: null,
    done: false,
    loading: false,
    failed: false,
    watched: null
};

const alertsReducer = (state = defaultState, action) => {
    switch (action.type) {
        case "GET_ALERTS":
        case "SET_ALERTS":
        case "SET_ALERTS_LOADING":
        case "SET_ALERTS_FAILED":
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
export default alertsReducer;