const initialState = {
  retweetGraphs: null,
  retweetMessage: null,
  graphs: null,
  message: null,
  coRepyClickedNode: null,
  coReplyGraph: null,
  coRetweetGraph: null,
};

const graphsReducer = (state = initialState, action) => {
  switch (action.type) {
    case "FORGET_GRAPHS":
      state = initialState;
      return state;
    case "GET_GRAPHS":
      return {
        ...state,
        graphs: action.payload,
      };
    case "GRAPH_MESSAGE":
      return {
        ...state,
        graphs: state.graphs,
        ...action.payload,
      };
    case "FORGET_RETWEET_GRAPHS":
      state = initialState;
      return state;
    case "GET_RETWEET_GRAPHS":
      return {
        ...state,
        retweetGraphs: action.payload,
      };
    case "RETWEET_GRAPH_MESSAGE":
      return {
        ...state,
        retweetGraphs: state.graphs,
        ...action.payload,
      };
    case "COREPLY_CLICKED_NODE":
      return {
        ...state,
        coRepyClickedNode: action.payload,
      };

    case "STORE_COREPLY_SIGMA_GRAPH":
      return {
        ...state,
        coReplySigmaGraph: action.payload,
      };
    case "STORE_CORETWEET_SIGMA_GRAPH":
      return {
        ...state,
        coRetweetSigmaGraph: action.payload,
      };
    default:
      return state;
  }
};
export default graphsReducer;
