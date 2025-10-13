const defaultState = {
    decay: null,
    done: false,
    loading: false,
    failed: false
};

const datasetDecayReducer = (state = defaultState, action) => {
    switch (action.type) {
        case "GET_DATASET_DECAY":
        case "SET_DATASET_DECAY":
        case "SET_DATASET_DECAY_LOADING":
        case "SET_DATASET_DECAY_FAILED":
            return Object.assign({}, state, action.payload);
        default:
            return state;
    }
};
export default datasetDecayReducer;