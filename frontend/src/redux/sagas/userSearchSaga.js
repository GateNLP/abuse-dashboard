import { all, call, fork, put, select, takeLatest } from "redux-saga/effects";
import {
    setUserSearchLoading,
    setUserSearchResult,
    setFlashMessage
} from "../actions/userSearchActions";
import ConversationAPI from "../../api";

const conversationApi = ConversationAPI()

function* getUserSearchQuerySaga() {
    yield takeLatest(["SET_USER_SEARCH_QUERY"], handleQuery)
}

function* handleQuery(action) {

    console.log(action);

    try {
        yield put(setUserSearchLoading(true))

        // get the URL of the tweet we have been given through the UI
        const query = yield select(state => state.userSearch.query)

        if (query === null || query.trim() === "") {
            yield put(setFlashMessage("error", "Please enter a search query"));
            return;
        }

        // get the tweet from the elasticsearch index via the backend
        let users = yield call(conversationApi.searchUsers, query)

        if (users.flashMessage) {
            yield put(setFlashMessage(users.flashType, users.flashMessage));
            return;
        }

        yield put(setUserSearchResult(users, false, true, false));
    } catch (error) {
        console.log(error)
        yield put(setFlashMessage("error", "An unexpected error occured, please try again later."));
    }
}

export default function* conversationSaga() {
    yield all([
        fork(getUserSearchQuerySaga),
    ]);
}