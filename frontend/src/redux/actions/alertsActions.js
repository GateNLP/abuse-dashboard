
export const setAlerts = (alerts, loading, done, failed) => {
    return {
        type: "SET_ALERTS",
        payload: {
            alerts: alerts,
            loading: loading,
            done: done,
            failed: failed,
            watched: null
        }
    };
}

export const getAlerts = (watched = null) => {
    return {
        type: "GET_ALERTS",
        payload: {
            watched: watched
        }
    };
}


export const setAlertsLoading = (loading) => {
    return {
        type: "SET_ALERTS_LOADING",
        payload: {
            loading: loading,
        }
    };
}

export const setAlertsFailed = (failed) => {
    return {
        type: "SET_ALERTS_FAILED",
        payload: {
            failed: failed,
        }
    };
}