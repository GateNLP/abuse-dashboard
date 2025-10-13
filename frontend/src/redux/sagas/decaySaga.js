import { all, call, fork, put, takeLatest } from "redux-saga/effects";
import { setDatasetDecayLoading, setDatasetDecay } from "../actions/decayActions";

import ConversationAPI from "../../api";

const conversationApi = ConversationAPI()

function* getDatasetDecaySaga() {
    yield takeLatest(["GET_DATASET_DECAY"], handleDatasetDecay);
}

function* handleDatasetDecay(action) {
    console.log("INSIDE handleDatasetDecay");
    try {
        yield put(setDatasetDecayLoading(true))
        let datasetDecay = yield call(conversationApi.getDatasetDecay, action.payload.from, action.payload.to, action.payload.query, action.payload.filter);
        console.log(datasetDecay)
        yield put(setDatasetDecay(datasetDecay, false, true, false))
    } catch (error) {
        console.log(error)
        yield put(setDatasetDecay(null, false, true, true))
    }
}

export default function* datasetDecaySaga() {
    yield all([
        fork(getDatasetDecaySaga)
    ]);
}
