import {combineReducers} from "redux";
import dictionaryReducer from "./dictionaryReducer";
import dashboardReducer from "./dashboardReducer";
import abusiveReducer from "./abusiveReducer";
import conversationReducer from "./conversationReducer";
import graphsReducer from "./graphsReducer";
import datasetDecayReducer from "./decayReducer";
import userSearchReducer from "./userSearchReducer";
import alertsReducer from "./alertsReducer";
import summaryReducer from "./summaryReducer";
import coordinationReducer from "./coordinationReducers";

const allReducers = combineReducers({
    dictionary: dictionaryReducer,
    dashboard: dashboardReducer,
    abusive: abusiveReducer,
    conversation: conversationReducer,
    graphs: graphsReducer,
    datasetDecay: datasetDecayReducer,
    userSearch: userSearchReducer,
    alerts: alertsReducer,
    summary: summaryReducer,
    coordination: coordinationReducer,
});

export default allReducers;
