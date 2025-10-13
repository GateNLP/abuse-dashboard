import {all, call, fork, put, select, takeLatest} from "redux-saga/effects";

import {getDatasetDecay} from "../actions/decayActions";

import ConversationAPI from "../../api";
import {setDateRange, setIndexLoading, setIndexOverview, setLanguages, setPlatforms, setEvents, setTopics, setCountries, setSources } from "../actions/dashboardActions";
import {getAbusiveOverview} from "../actions/abusiveActions";
import { getAlerts } from "../actions/alertsActions";
import { getSummary } from "../actions/summaryActions";

const conversationApi = ConversationAPI()


function* getIndexOverviewSaga() {
    yield takeLatest(["GET_INDEX_OVERVIEW"], handleGetIndexOverview);
}


function* handleGetIndexOverview(action) {

    try {
        yield put(setIndexLoading(true))

        // why is this null instead of the default from the state object
        let topicMode = yield select(state => state.dashboard.settings.topicMode) || "theme";

        let overview = yield call(conversationApi.getIndexOverview, false, action.payload.query, action.payload.filter, action.payload.from, action.payload.to, topicMode);

        overview.from = new Date(overview.from);
        overview.to = new Date(overview.to);

        yield put(setDateRange(new Date(overview.minDate), new Date(overview.maxDate)));

        let user = yield select(state => state.dashboard.user);

        if (user == null) {
            //user = yield call(conversationApi.getUser, overview.users[0].handle, action.payload.to)
            user = {
                name: overview.title,
                id: overview.dashboard_id
            }
        }

        let languages = yield select(state => state.dashboard.languages);

        if (languages == null) {
            yield put(setLanguages(Object.keys(overview.all.languages)));
        }

        let platforms = yield select(state => state.dashboard.platforms);

        if (platforms == null) {
            yield put(setPlatforms(Object.keys(overview.all.platforms)));
        }

        let topics = yield select(state => state.dashboard.topics);

        if (topics == null) {
            yield put(setTopics(Object.keys(overview.all.topics)));
        }

        let countries = yield select(state => state.dashboard.countries);

        if (countries == null) {
            var keys = new Set([...Object.keys(overview?.twitter?.countries), ...Object.keys(overview?.tiktok?.countries)])

            if (keys.size > 0) yield put(setCountries(keys));
        }

        let sources = yield select(state => state.dashboard.sources);

        if (sources == null) {
            if (overview.all.sources.length > 0) yield put(setSources(overview.all.sources));
        }

        let events = yield select(state => state.dashboard.events);

        if (events == null) {
            events = [];

            overview.events?.forEach(event => {

                var line = "date" in event;

                let e = {
                    y0: 0,
                    y1: 1,
                    yref: "paper",
                }

                if (line) {
                    e.type = "line";
                    e.x0 = event.date;
                    e.x1 = event.date;
                    e.line = {
                        color: 'grey',
                        width: 1.5,
                        dash: 'dot'
                    };

                    e.label = {
                        text: event.label,
                        font: { size: 12, color: "rgb(68, 68, 68)" },
                        textposition: 'end',
                        xanchor: 'left',
                        textangle: 90
                    };

                } else {
                    e.type = "rect";
                    e.x0 = event.from;
                    e.x1 = event.to;
                    e.fillcolor = 'grey';
                    e.opacity = 0.1;
                    e.line = {
                        width: 0
                    };
                    e.label = {
                        text: event.label,
                        font: { size: 12, color: "rgb(68, 68, 68)" },
                        textposition: 'top center'
                    };
                }

                events.push(e);
            })
            
            yield put(setEvents(events));

            // store the events
        }

        yield put(setIndexOverview(overview, user, false, true, false));

        yield put(getAbusiveOverview(action.payload.query, action.payload.filter, action.payload.from, action.payload.to));

        yield put(getSummary(action.payload.query, action.payload.filter, action.payload.from, action.payload.to));
        
        let location = yield select(state => state.dashboard.location);

        const watched = localStorage.getItem(location.suffix+"watched");

        if (watched == null)
            yield put(getAlerts())
        else
            yield put(getAlerts(JSON.parse(watched)))

        // we will still run the backend code so that legacy accounts
        // work when the appropriate flag is unabled etc.
        yield put(getDatasetDecay(action.payload.query, action.payload.filter, overview.from, overview.to));
    } catch (error) {
        console.log(error)
        yield put(setIndexOverview(null, null, false, true, true))
    }
}

export default function* dashboardSaga() {
    yield all([
        fork(getIndexOverviewSaga),
    ]);
}