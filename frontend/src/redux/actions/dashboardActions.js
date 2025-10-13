export const setIndexLoading = (loading) => {
    return{
        type : "SET_INDEX_LOADING",
        payload : {
            loading: loading,
        }
    };
}

export const getIndexOverview = (query, filter, from, to) => {
    return{
        type : "GET_INDEX_OVERVIEW",
        payload : {
            query: query || "",
            filter: filter || {authors:[], mentions:[], hashtags: [], languages: []},
            from: from,
            to: to
        }
    };
};

export const setIndexOverview = (overview, user, loading, done, failed) => {
    return{
        type : "SET_INDEX_OVERVIEW",
        payload : {
            overview : overview,
            user: user,
            done: done,
            loading: loading,
            failed: failed
        }
    };
}

export const setDateRange = (minDate, maxDate) => {
    return {
        type: "SET_DATE_RANGE",
        payload : {
            minDate: minDate,
            maxDate: maxDate
        }
    }
}

export const setLanguages = (languages) => {
    return {
        type: "SET_LANGUAGES",
        payload : {
            languages: languages
        }
    }
}

export const setPlatforms = (platforms) => {
    return {
        type: "SET_PLATFORMS",
        payload : {
            platforms: platforms
        }
    }
}

export const setTopics = (topics) => {
    return {
        type: "SET_TOPICS",
        payload : {
            topics: topics
        }
    }
}

export const setCountries = (countries) => {
    return {
        type: "SET_COUNTRIES",
        payload : {
            countries: countries
        }
    }
}

export const setSources = (sources) => {
    return {
        type: "SET_SOURCES",
        payload : {
            sources: sources
        }
    }
}


export const setEvents = (events) => {
    return {
        type: "SET_EVENTS",
        payload : {
            events: events
        }
    }
}

// settings
export const setAnonymousMode = (anonymousMode) => {
    return{
        type : "SET_ANONYMOUS_MODE",
        payload : {
            anonymousMode: anonymousMode,
        }
    };
}


export const setAbuseThreshold = (abuseThreshold) => {
    return{
        type : "SET_ABUSE_THRESHOLD",
        payload : {
            abuseThreshold: abuseThreshold,
        }
    };
}

export const setAbuseRetweetThreshold = (abuseRetweetThreshold) => {
    return{
        type : "SET_ABUSE_RETWEET_THRESHOLD",
        payload : {
            abuseRetweetThreshold: abuseRetweetThreshold,
        }
    };
}

export const setComplianceMode = (complianceMode) => {
    return{
        type : "SET_COMPLIANCE_MODE",
        payload : {
            complianceMode: complianceMode,
        }
    };
}

export const setMaxCSVRows = (rows) => {
    return {
        type: "SET_MAX_CSV_ROWS",
        payload: {
            maxCSVRows: rows
        }
    }
}

export const setSnackMessage = (snackMessage, severity, snackAutoHideDuration) => {
    return{
        type : "SET_SNACK_MESSAGE",
        payload : {
            snackMessage: snackMessage,
            snackSeverity:severity,
            snackAutoHideDuration:snackAutoHideDuration
        }
    };
}


export const setAppLocation = (location) => {
    return{
        type : "SET_LOCATION",
        payload : {
            location: location,
        }
    };
}