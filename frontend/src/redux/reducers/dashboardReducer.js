const initDashboardState = {
    overview: null,
    location: null,
    user: null,
    query: null,
    filter: {
        authors: [],
        mentions: [],
        hashtags: [],
        languages: [],
    },
    minDate: null,
    maxDate: null,
    languages: null,
    platforms: null,
    topics: null,
    countries: null,
    sources: null,
    events: null,
    settings: {
        anonymousMode: false,
        abuseThreshold: 5,
        abuseRetweetThreshold: 5,
        maxCSVRows: 0
    },
    done: false,
    loading: false,
    failed: false,
    snackMessage: null,
    snackSeverity: null,
    snackAutoHideDuration: null,
};

const dashboardReducer = (state = initDashboardState, action) => {
    switch (action.type) {
        case "GET_INDEX_OVERVIEW":
            state = {
                settings: state.settings,
                minDate: state.minDate,
                maxDate: state.maxDate,
                languages: state.languages,
                platforms: state.platforms,
                topics: state.topics,
                countries: state.countries,
                location: state.location,
                sources: state.sources
            };
        // eslint-disable-next-line
        case "SET_INDEX_LOADING":
        case "SET_INDEX_OVERVIEW":
        case "SET_DATE_RANGE":
        case "SET_LANGUAGES":
        case "SET_PLATFORMS":
        case "SET_TOPICS":
        case "SET_COUNTRIES":
        case "SET_SOURCES":
        case "SET_EVENTS":
        case "SET_SNACK_MESSAGE":
        case "SET_LOCATION":
            return Object.assign({}, state, action.payload);
        case "SET_ANONYMOUS_MODE":
        case "SET_ABUSE_THRESHOLD":
        case "SET_ABUSE_RETWEET_THRESHOLD":
        case "SET_MAX_CSV_ROWS":
        case "SET_COMPLIANCE_MODE":
            return {
                ...state,
                settings: {
                    ...state.settings,
                    ...action.payload,
                },
            };
        default:
            return state;
    }
};
export default dashboardReducer;