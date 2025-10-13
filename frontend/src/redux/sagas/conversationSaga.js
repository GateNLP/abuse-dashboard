import {all, call, fork, put, select, takeLatest} from "redux-saga/effects";
import {
    setConversationCategories,
    setConversationLoading,
    setConversationResult,
    setFlashMessage,
    setHashtagCloud, setStance, setTweet, setTweetID
} from "../actions/conversationActions";
import ConversationAPI, { getPostLink } from "../../api";


const conversationApi = ConversationAPI()


function* getConversationURLSaga() {
    yield takeLatest(["SET_CONVERSATION_INPUT"], handleConversationURL)
}

function* getConversationTweetSaga() {
    yield takeLatest(["SET_CONVERSATION_TWEET_ID"], handleConversationTweetID)
}

function* getConversationExplorterSaga() {
    yield takeLatest(["SET_CONVERSATION_TWEET", "SET_CONVERSATION_FILTER", "SET_CONVERSATION_RESTRICTION"], handConversationExplorer)
}

function* handConversationExplorer(action) {

    try {
        yield put(setConversationLoading(true))
        const id_str = yield select(state => state.conversation.id_str)
        const filter = yield select(state => state.conversation.filter)
        const restrict = yield select(state => state.conversation.restriction)

        // now we get the conversation object from the backend (this is essentially
        // a summary of the direct replies to the tweet)
        let conversation = yield call(conversationApi.getConversation, id_str, filter, restrict)

        // in a similar way the hashtag info isn't in the format needed for drawing
        // the word cloud either so again we'll set up the data structure...
        const cloud = [];

        // ... push the data into it and finally...
        Object.keys(conversation.hashtags).forEach(hashtag => {
            cloud.push({text: hashtag, value: conversation.hashtags[hashtag]})
        })

        // ... stick the object into the state ready for use
        yield put(setHashtagCloud(cloud))
        yield put(setConversationResult(conversation, false, true, false))
    }
    catch (error) {
        console.log(error)
        yield put(setConversationResult(null, false, true, true))
    }

}

function* handleConversationURL(action) {

    // get the URL of the tweet we have been given through the UI
    const tweetURL = yield select(state => state.conversation.url)

    if (!tweetURL) {
        yield put(setFlashMessage("error", "Please enter a URL which points to a single Tweet", false));
        return;
    }

    if (tweetURL.match(/^[0-9]+$/)) {
        yield put(setTweetID(tweetURL))
        return;

    }

    var id_str = null;

    if (tweetURL.indexOf("//twitter.com") !== -1 || tweetURL.indexOf("//x.com") != -1) {
    
        // use a regex to grab the status ID from the URL, and hence
        // do some validation of the URL
        const data = tweetURL.match(/(?:x|twitter)\.com\/.*\/status(?:es)?\/([^/?]+)/)

        if (data == null) {
            // if the regex didn't match then the URL isn't to a tweet so we
            // stop and report an error message of some kind
            // TODO how do I get the translations into here
            yield put(setFlashMessage("error", "Please enter a URL which points to a single Tweet", false));

            return;
        }

        id_str = data[1];
    } else if (tweetURL.indexOf("//youtube.com") !== -1) {
        
        const data = tweetURL.match(/youtube\.com\/watch\?v=([^&]+)(.*&lc=([^&]+))?/);

        if (data[3] !== undefined)
            id_str = data[3];
        else
            id_str = data[1];

    } else if (tweetURL.indexOf("//t.me/") !== -1) {
        //const data = tweetURL.match(/t\.me\/([^\/]+)\/([0-9]+)/);

        yield put(setFlashMessage("error", "Unfortunately we can't currently find Telegram posts via URL. Please explore Telegram posts by selecting 'Explore' elsewhere in the dashboard.", false));

        return;
    } else if (tweetURL.indexOf("tiktok.com") !== -1) {

        const data = tweetURL.match(/tiktok\.com\/[^/]+\/video\/([0-9]+)(\?share_comment_id=([0-9]+))?/);

        if (data[3] !== undefined)
            id_str = data[3];
        else
            id_str = data[1];

    } else if (tweetURL.indexOf("/users/") !== -1) {
        // assume for now this is a mastodon link

        id_str = tweetURL;
    }

    if (id_str === null) {
        yield put(setFlashMessage("error", "Please enter a URL which points to a single post", false));

        return;
    }


    yield put(setTweetID(id_str, tweetURL))
}

function* handleConversationTweetID(action) {

    const id_str = yield select(state => state.conversation.id_str)

    // get the tweet from the elasticsearch index via the backend
    let tweet = yield call(conversationApi.getTweet, id_str)

    if (tweet.flashMessage) {
        // set the falsh message but don't assume this is a fatal error
        yield put(setFlashMessage(tweet.flashType, tweet.flashMessage, tweet.flashRefresh));
    }

    if (!tweet.id) {
        // only stop processing if we don't have a tweet
        return;
    }

    // if the filter in the state is null then we've just hit the main
    // button to start from a new Tweet. So set the category filter to
    // all the possible values. Hmmm, possibly need to store these twice
    // as if we navigate to a reply the labels may be different (a subset)
    // which would cause the category check boxes shown to be different
    // which we don't want
    const categories  = yield select(state => state.conversation.categories)
    if (categories == null) {
        yield put(setConversationCategories(tweet.category_labels));
    }

    
    // work out the full URL for the tweet in case we started from the ID only
    // (i.e. navigating for an in_reply_to_status_id_str link etc.)
    var tweetURL = getPostLink(tweet);

    // store the tweet object into the state
    yield put(setTweet(tweet, tweetURL))

    // the stance info in the conversation object isn't exactly what we need in
    // order to generate the pie chart so let's setup the data object...
    const stance = {
        values: [],
        ids: [],
        type: "pie",
        textinfo: "label+percent",
        textposition: "outside",
        automargin: true,
        marker: {
            colors: []
        }
    };

    // and then push the info from the original structure into the right places
    Object.keys(tweet.categories).forEach(entry => {
        stance.ids.push(entry)
        stance.values.push(tweet.categories[entry])
        stance.marker.colors.push(tweet.category_labels[entry].color);
    })

    // and then put the built object into the state ready for use
    yield put(setStance(stance))
}


export default function* conversationSaga() {
    yield all([
        fork(getConversationURLSaga),
        fork(getConversationTweetSaga),
        fork(getConversationExplorterSaga),
    ]);
}