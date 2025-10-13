import { all, call, fork, put, takeLatest } from "redux-saga/effects";
import { setAlertsLoading, setAlerts} from "../actions/alertsActions";

import ConversationAPI from "../../api";

const conversationApi = ConversationAPI()

function* getAlertsSaga() {
    yield takeLatest(["GET_ALERTS"], handleAlerts);
}

function* handleAlerts(action) {
    try {
        yield put(setAlertsLoading(true))
        let alerts = yield call(conversationApi.getAlerts, action.payload.watched);
        yield put(setAlerts(alerts, false, true, false))
    } catch (error) {
        yield put(setAlerts(null, false, true, true))
    }
}

export default function* alertsSaga() {
    yield all([
        fork(getAlertsSaga)
    ]);
}
