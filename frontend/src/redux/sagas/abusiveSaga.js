import { all, call, fork, put, takeLatest, select } from "redux-saga/effects";
import { getAbusiveTriggers, setAbusiveOverview, setAbusiveStatus, setAbusiveTriggers } from "../actions/abusiveActions";
import ConversationAPI from "../../api";

const conversationApi = ConversationAPI()

function* getAbusiveOverviewSaga() {
    yield takeLatest(["GET_ABUSIVE_OVERVIEW"], handleGetAbusiveOverview);
}

function* getAbusiveTriggersSaga() {
    yield takeLatest(["GET_ABUSIVE_TRIGGERS"], handleGetAbusiveTriggers);
}

function* handleGetAbusiveOverview(action) {
    try {
        yield put(setAbusiveStatus(true, false, false));

        let topicMode = yield select(state => state.dashboard.settings.topicMode);

        let overview = yield call(conversationApi.getIndexOverview, true, action.payload.query, action.payload.filter, action.payload.from, action.payload.to, topicMode);

        overview.from = new Date(overview.from);
        overview.to = new Date(overview.to);

        yield put(setAbusiveOverview(overview));
        yield put(getAbusiveTriggers(action.payload.query, action.payload.filter, action.payload.from, action.payload.to));
    } catch (error) {
        console.log(error)
        yield put(setAbusiveStatus(false, true, true))
    }
}

function* handleGetAbusiveTriggers(action) {
    try {
        yield put(setAbusiveStatus(true, false, false));
        let replyThreshold = yield select(state => state.dashboard.settings.abuseThreshold);
        let retweetThreshold = yield select(state => state.dashboard.settings.abuseRetweetThreshold);

        let triggers = yield call(conversationApi.getAbusiveTriggers, action.payload.query, action.payload.filter, action.payload.from, action.payload.to, replyThreshold, retweetThreshold);
        triggers.from = new Date(triggers.from);
        triggers.to = new Date(triggers.to);

        yield put(setAbusiveTriggers(triggers));
        yield put(setAbusiveStatus(false, true, false))
    } catch (error) {
        console.log(error)
        yield put(setAbusiveStatus(false, true, true))

    }
}

export default function* abusiveSaga() {
    yield all([
        fork(getAbusiveOverviewSaga),
        fork(getAbusiveTriggersSaga)
    ]);
}
