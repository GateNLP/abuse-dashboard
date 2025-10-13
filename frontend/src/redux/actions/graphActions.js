export const getRetweetGraphsAct = (retweetGraphs) => {
    return{
        type : "GET_RETWEET_GRAPHS",
        payload : retweetGraphs
    };
}

export const setRetweetGraphMessage = (message) => {
    return {
        type : "RETWEET_GRAPH_MESSAGE",
        payload : {
            retweetMessage: message,
        }
    };
}

export const getGraphsAct = (graphs) => {
    return{
        type : "GET_GRAPHS",
        payload : graphs
    };
}

/**
 * Stores the json content of coreply that retrieved from networkg
 * @param coReplyGraph as json
 * @returns 
 */
export const storeCoReplySigmaGraphAct = (coReplySigmaGraph) => {
    return{
        type : "STORE_COREPLY_SIGMA_GRAPH",
        payload : coReplySigmaGraph
    };
}
/**
 * Stores the json content of coretweet that retrieved from networkg
 * @param coreplyGraph as json
 * @returns 
 */
export const storeCoRetweetSigmaGraphAct = (coRetweetSigmaGraph) => {
    return{
        type : "STORE_CORETWEET_SIGMA_GRAPH",
        payload : coRetweetSigmaGraph
    };
}


export const setGraphMessage = (message) => {
    return {
        type : "GRAPH_MESSAGE",
        payload : {
            message: message,
        }
    };
}

export const forgetGraphs = () => {
    return {
        type: "FORGET_GRAPHS",
        payload: {}
    };
}

//Keeps track of last clicked node, it should be in global state
export const coRepyClickedNode = (nodeWithAtt) => {
    return{
        type : "COREPLY_CLICKED_NODE",
        payload : nodeWithAtt
    };
}