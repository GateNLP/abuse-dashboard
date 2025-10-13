export const requestCoordination = (query, filter, from, to) => {
    return{
        type : "REQUEST_COORDINATION",
        payload : {
            query: query || "",
            filter: filter || {authors:[], mentions:[], hashtags: [], languages: []},
            from: from,
            to: to
        }
    };
};

export const getCoordinationStatus = (jobID) => {
    return{
        type : "GET_COORDINATION_STATUS",
        payload : {
            jobID: jobID
        }
    };
};

export const getCoordinationGraph = (jobID) => {
    return{
        type : "GET_COORDINATION_GRAPH",
        payload : {
            jobID: jobID
        }
    };
};

export const setCoordinationGraph = (graph, data) => {
    return{
        type : "SET_COORDINATION_GRAPH",
        payload : {
            graph: graph,
            data: data
        }
    };
};

export const setCoordinationStatus = (jobID, status) => {
    return {
        type: "SET_COORDINATION_STATUS",
        payload: {
            jobID: jobID,
            status: status
        }
    }
}

export const forgetCoordination= () => {
    return {
        type: "FORGET_COORDINATION",
        payload: {

        }
    }
}