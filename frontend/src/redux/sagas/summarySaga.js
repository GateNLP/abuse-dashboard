import { all, call, fork, put, takeLatest } from "redux-saga/effects";
import { setSummaryLoading, setSummary} from "../actions/summaryActions";

import ConversationAPI from "../../api";

const conversationApi = ConversationAPI()

function* getSummarySaga() {
    yield takeLatest(["GET_SUMMARY"], handleSummary);
}

function* handleSummary(action) {
    console.log("getting the summary.... I hope")
    
    try {
        yield put(setSummaryLoading(true))
        let summary = yield call(conversationApi.getSummary, action.payload.query, action.payload.filter, action.payload.from, action.payload.to);
        yield put(setSummary(summary, false, true, false))
    } catch (error) {
        console.log(error);
        yield put(setSummary(null, false, true, true))
    }
}

export default function* summarySaga() {
    yield all([
        fork(getSummarySaga)
    ]);
}
