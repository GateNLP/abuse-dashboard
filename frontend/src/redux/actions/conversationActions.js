export const setConversationInput = (url) => {
    return {
        type: "SET_CONVERSATION_INPUT",
        payload: {
            url: url,
            loading: true
        }
    }
};

export const setTweetID = (id_str, url) => {
    return {
        type: "SET_CONVERSATION_TWEET_ID",
        payload: {
            id_str: id_str,
            url: url,
            loading: true
        }
    }
};

export const setConversationFilter = (filter) => {
    return {
        type: "SET_CONVERSATION_FILTER",
        payload: {
            filter: filter,
            cloud: null,
            done: false,
            loading: true
        }
    }
};

export const setConversationCategories = (categories) => {
    return {
        type: "SET_CONVERSATION_CATEGORIES",
        payload: {
            categories: categories,
            filter: categories,
            cloud: null,
            done: false,
            loading: true
        }
    }
};


export const setConversationRestriction = (restriction) => {
    return {
        type: "SET_CONVERSATION_RESTRICTION",
        payload: {
            restriction: restriction,
            cloud: null,
            done: false,
            loading: true
        }
    }
};

export const setConversation = (conversation) => {
    return {
        type: "SET_CONVERSATION_ROOT",
        payload: {
            conversation: conversation,
        }
    }
}

export const setHashtagCloud = (cloud) => {
    return {
        type: "SET_CONVERSATION_CLOUD",
        payload: {
            cloud: cloud,
            loading: false
        }
    }
}

export const setStance = (stance) => {
    return {
        type: "SET_CONVERSATION_STANCE",
        payload: {
            stance: stance,
        }
    }
}

export const setTweet = (tweet, url) => {
    return {
        type: "SET_CONVERSATION_TWEET",
        payload: {
            tweet: tweet,
            url: url,
        }
    }
}

export const setFlashMessage = (type, message, refresh) => {
    return {
        type: "SET_CONVERSATION_FLASH",
        payload: {
            loading: false,
            flashType: type,
            flashMessage: message,
            flashRefresh: refresh,
        }
    }
}


export const setConversationLoading = (loading) => {
    return {
        type: "SET_CONVERSATION_LOADING",
        payload: {
            loading: loading,
        }
    }
}

export const setConversationResult = (result, loading, done, failed) => {
    return {
        type: "SET_CONVERSATION_RESPONSE",
        payload: {
            conversation: result,
            loading: loading,
            done: done,
            failed: failed
        }
    }
}
