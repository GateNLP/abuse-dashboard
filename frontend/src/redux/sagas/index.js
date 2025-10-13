import {all, fork} from 'redux-saga/effects'
import conversationSaga from "./conversationSaga";
import dashboardSaga from "./dashboardSaga";
import abusiveSaga from "./abusiveSaga";
import datasetDecaySaga from "./decaySaga"
import userSearchSaga from "./userSearchSaga";
import alertsSaga from './alertsSaga';
import summarySaga from './summarySaga';
import coordinationSaga from './coordinationSaga';

export default function* rootSaga() {
    yield all([
        fork(dashboardSaga),
        fork(conversationSaga),
        fork(abusiveSaga),
        fork(datasetDecaySaga),
        fork(userSearchSaga),
        fork(alertsSaga),
        fork(summarySaga),
        fork(coordinationSaga)
    ]);
}