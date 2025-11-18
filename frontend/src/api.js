import axios from "axios";

import TwitterIcon from "@mui/icons-material/Twitter";
import YouTubeIcon from "@mui/icons-material/YouTube";
import TelegramIcon from "@mui/icons-material/Telegram";
import { ReactComponent as MastodonIcon } from "./images/mastodon.svg"
import { ReactComponent as TikTokIcon } from "./images/tiktok.svg";
import { ReactComponent as ThreadsIcon } from "./images/threads.svg";
import OtherIcon from "@mui/icons-material/QuestionAnswer";
import FacebookIcon from '@mui/icons-material/Facebook';
import InstagramIcon from '@mui/icons-material/Instagram';


export default function ConversationAPI() {

    const endpoint = ".";//process.env.REACT_APP_CONVERSATION_API

    const formatLargeNumber = (labelValue) => {

        if (labelValue === null || labelValue === undefined || labelValue === "") return 0;

        var number = Math.abs(Number(labelValue));

        // Nine Zeroes for Billions
        return number >= 1.0e+9
    
        ? (number / 1.0e+9).toFixed(2) + "B"
        // Six Zeroes for Millions 
        : number >= 1.0e+6
    
        ? (number / 1.0e+6).toFixed(2) + "M"
        // Three Zeroes for Thousands
        : number >= 1.0e+3
    
        ? (number / 1.0e+3).toFixed(2) + "K"
    
        : number;
    
    }

    function formatSeconds(seconds) {
        seconds = Number(seconds);

        if (seconds <= 0) return "";

        var d = Math.floor(seconds / (3600*24));
        var h = Math.floor(seconds % (3600*24) / 3600);
        var m = Math.floor(seconds % 3600 / 60);
        var s = Math.floor(seconds % 60);
        
        /*var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
        var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";*/
    
        var dDisplay = d > 0 ? d + "d " : "";
        var hDisplay = h > 0 ? h + "h " : "";
        var mDisplay = m > 0 ? m + "m " : "";
        var sDisplay = s > 0 ? s + "s " : ""

        return dDisplay + hDisplay + mDisplay + sDisplay;
    }

    const getSummary = async(query, filter, from, to) => {
        let json = await axios.post(endpoint+"/accounts?"
            +"query="+encodeURIComponent(query || "")
            +"&from="+encodeURIComponent(getISODate(from))
            +"&to="+encodeURIComponent(getISODate(to)),
             filter)

        return json.data
    }

    const getIndexOverview = async (abusive, query, filter, from, to) => {
        let json = await axios.post(endpoint+"/overview?"
            +"abusive="+abusive+"&query="+encodeURIComponent(query || "")
            +"&from="+encodeURIComponent(getISODate(from))
            +"&to="+encodeURIComponent(getISODate(to)), filter)

        return json.data
    }

    const getAbusiveTriggers = async (query, filter, from, to, replyThreshold, retweetThreshold) => {
        let json = await axios.post(endpoint+"/triggers?"
            +"query="+encodeURIComponent(query || "")
            +"&from="+encodeURIComponent(getISODate(from))
            +"&to="+encodeURIComponent(getISODate(to))
            +"&replyThreshold="+replyThreshold
            +"&retweetThreshold="+retweetThreshold, filter)
        return json.data
    }

    /**
     * Retrieves a JSON object respresenting an individual tweet from
     * the backend. This includes some summary information derived
     * from direct replies to this tweet. This information isn't currently
     * used but could drive further visualizations
     * @param {*} id the ID of the tweet we are interested in
     * @returns a JSON object representing the requested tweet
     */
    const getTweet = async (id) => {
        let json = await axios.get(endpoint+"/tweet?id="+id).catch((error) =>{
            console.log("an error occured getting the tweet by ID");
            return {data: {
                    flashMessage: "Unfortunately the service is currently down. Please try again later.",
                    flashType: "error",
                    flashRefresh: false
                }
            };
        });

        // TODO add error handling

        return json.data
    }

    /**
     * Retrieves a JSON object representing the conversation from
     * the backend. This includes the summary info needed for a lot of
     * the visualizations.
     * @param {*} id the ID of the conversation we are interested in
     * @returns a JSON object representing the requested conversation
     */
    const getConversation = async (id, stance, restrict) => {
        let json = await axios.get(endpoint+"/conversation?id="+id+"&categories="+stance+"&restrict="+restrict).catch((error) =>{
            console.log("an error occured getting the conversation by ID");
            return {data: {
                    flashMessage: "Unfortunately the service is currently down. Please try again later.",
                    flashType: "error",
                    flashRefresh: false
                }
            };
        });

        // TODO add error handling

        return json.data
    }

    const getEngagement = async (from, to) => {
        let json = await axios.get(endpoint+"/engagement?"
            +"&from="+encodeURIComponent(getISODate(from))
            +"&to="+encodeURIComponent(getISODate(to))).catch((error) =>{
            console.log("an error occurred getting engagement details: " + error);
            return {data: {
                    flashMessage: "Unfortunately the service is currently down. Please try again later.",
                    flashType: "error",
                    flashRefresh: false
                }
            };
        });
        return json.data
    }

    const getDatasetDecay = async (from, to, query, filter) => {
        let json = await axios.post(endpoint+"/decay?"
        +"&from="+encodeURIComponent(getISODate(from))
        +"&to="+encodeURIComponent(getISODate(to))
        +"&query="+encodeURIComponent(query || ""), filter).catch((error) =>{
        console.log("an error occurred getting dataset decay details: " + error);
        return {data: {
                flashMessage: "Unfortunately the service is currently down. Please try again later.",
                flashType: "error",
                flashRefresh: false
            }
        };
    });
    return json.data
    }

    const getAlerts = async (watched) => {
        let json = await axios.post(endpoint+"/alerts", watched, {
            headers: {
                'Content-Type': 'application/json',
            }}).catch((error) => {
            console.log("an error occured getting alert info");
            return {
                data: {
                    flashMessage: "Unfortunately the service is currently down. Please try again later.",
                    flashType: "error",
                    flashRefresh: false
                }
            }
        });

        return json.data;
    }

    const getUser = async (screen_name, date) => {
        let json = await axios.get(endpoint+"/user?screen_name="+screen_name+"&date="+encodeURIComponent(getISODate(date))).catch((error) =>{
            console.log("an error occured getting the conversation by ID");
            return {data: {
                    flashMessage: "Unfortunately the service is currently down. Please try again later.",
                    flashType: "error",
                    flashRefresh: false
                }
            };
        });

        return json.data;
    }

    const searchUsers = async (query) => {
        let json = await axios.get(endpoint+"/user/search?query="+encodeURIComponent(query)).catch((error) =>{
            console.log("an error occured getting the conversation by ID");
            return {data: {
                    flashMessage: "Unfortunately the service is currently down. Please try again later.",
                    flashType: "error"
                }
            };
        });

        return json.data;
    }

    return {
        getIndexOverview,
        getTweet,
        getConversation,
        getEngagement,
        getUser,
        getAbusiveTriggers,
        getDatasetDecay,
        formatLargeNumber,
        formatSeconds,
        searchUsers,
        getAlerts,
        getSummary
    }
}

//Anonymize a string if it is set to true

export function anonymize(str, anonymousMode){
    let res = str
    let stars="***"
        if (str){
        if (anonymousMode){
            res = str.charAt(0)+stars
            if (str.length<=3){
            }else 
            res = str.slice(0,2)+stars
            }
        }
    return res
}

export function getISODate(dateTime) {

    if (dateTime === null || dateTime === undefined || dateTime === "") return "";

    var year = dateTime.getFullYear();
    var month = dateTime.getMonth()+1;
    var day = dateTime.getDate();

    if (month<10) month = "0"+month;
    if (day<10) day = "0"+day;

    var date = year+"-"+month+"-"+day;

    return date;
}

export function getAccountLink(platform, handle) {
    if (platform === "Twitter")
    return `https://twitter.com/${handle}`;

  if (platform === "Telegram") {
    return `https://t.me/${handle}`;
  }

  if (platform === "YouTube") {
    return `https://youtube.com/@${handle}`;
  }

  if (platform === "Mastodon") {
      var parts = handle.split("@");
      return `https://${parts[1]}/users/${parts[0]}`;
  }

  if (platform === "TikTok") {
    return `https://www.tiktok.com/@${handle}`;
  }

  if (platform === "Instagram") {
    return `https://www.instagram.com/${handle}`;
  }

  if (platform === "Threads") {
    return  `https://www.threads.com/@${handle}`;
  }

  return "#";
}

export function getPlatformIcon(platform, style) {
    if (platform === "Twitter")
        return (<TwitterIcon alt="Twitter" style={style}/>)

    if (platform === "Telegram")
        return (<TelegramIcon alt="Telegram" style={style}/>)

    if (platform === "YouTube")
        return (<YouTubeIcon alt="YouTube" style={style}/>)

    if (platform === "Mastodon")
        return (<MastodonIcon alt="Mastadon" style={style}/>)

    if (platform === "TikTok")
        return (<TikTokIcon alt="TikTok" style={style}/>)

    if (platform === "Facebook")
        return  (<FacebookIcon alt="Facebook" style={style}/>)

    if (platform === "Instagram")
        return (<InstagramIcon alt="Instagram" style={style}/>)

    if (platform === "Threads")
        return (<ThreadsIcon alt="Threads" style={style}/>)

    return (<OtherIcon style={style}/>)
}

export function getPostLink(post) {

    if (post.platform === "Twitter")
        return `https://twitter.com/${post.user.screen_name}/status/${post.id}`

    if (post.platform === "Telegram") {
        var ids = post.id.split("_");
        return `https://t.me/${post.user.screen_name}/${ids[1]}`
    }

    if (post.platform === "YouTube") {
        if (post.in_reply_to === undefined)
            return `https://youtube.com/watch?v=${post.id}`

        return `https://youtube.com/watch?v=${post.conversation_id}&lc=${post.id}`;
    }

    if (post.platform === "TikTok") {
        // ideally need to use the actual account, but it seems to redirect regardless

        if (post.conversation_id === post.id)
            return `https://www.tiktok.com/@/video/${post.conversation_id}`

        // note that clicking the link works in the app to highlight the comment but not on the web version
        return `https://www.tiktok.com/@/video/${post.conversation_id}?share_comment_id=${post.id}`
    }

    if (post.platform === "Mastodon") {
        return post.id;
    }
    
    if (post.platform === "Facebook") {
        var parts = post.id.split("_");
        return "http://www.facebook.com/"+parts[0]+"/posts/"+parts[1]
    }

    if (post.platform === "Threads") {
        return `http://www.threads.com/@${post.user.screen_name}/post/${post.id}`
    }

    return "#"
}

export function getParentPostLink(post) {
    if (post.platform === "Twitter")
        return `https://twitter.com/${post.in_reply_to_screen_name}/status/${post.in_reply_to}`
    
    if (post.platform === "YouTube") {
        if (post.in_reply_to === post.conversation_id)
            return `https://youtube.com/watch?v=${post.conversation_id}`

            return `https://youtube.com/watch?v=${post.conversation_id}&lc=${post.in_reply_to}`;
    }

    if (post.platform === "Telegram") {
        var ids = post.in_reply_to.split("_");
        return `https://t.me/${post.in_reply_to_screen_name}/${ids[1]}`
    }

    if (post.platform === "TikTok") {
        if (post.in_reply_to === post.conversation_id)
            return `https://www.tiktok.com/@account/video/${post.conversation_id}`

        return `https://www.tiktok.com/@/video/${post.conversation_id}?share_comment_id=${post.in_reply_to}`

    }

    if (post.platform === "Facebook") {
        var parts = post.id.split("_");
        return "http://www.facebook.com/"+parts[0]+"/posts/"+parts[1]
    }
}

export function calcMaxY(timeline) {
    var timelineYVals = []

    timeline[0]?.y.forEach((val,ind)=>{

        // this is a nasty hack to deal with the Malta data where many
        // of the posts don't have dates. We've stuffed them all onto the
        // 1st Jan 1970, but we don't want the height of that bar to mess
        // with the layout so just ignore it
        if (ind === 0 && timeline[0].x[0] === "1970-01-01") return;
        
        var v = val;

        for (var i = 1 ; i < timeline.length ; ++i) {
            v += timeline[i].y[ind];
        }
        timelineYVals.push(v);
    });

    var max = Math.max.apply(0, timelineYVals)

    if (max === 0) return max

    var timelineMax = 1 + max + ((max/10))

    return timelineMax;
}

export function getPlotHeight(data) {

    if (data == null || data === undefined || data.length === 0 || Object.keys(data).length === 0) {
        console.error("no data passed to getPlotHeight, returning default of 100")
        return 100;
    }

    if (data.x)
        return 50 + (data.x.length*35);
    else
        return 50 + (Object.values(data)[0].x.length*35);
}

export function getFlagEmoji(countryCode) {

    if (countryCode === undefined || countryCode === "{UNKNOWN}") return "🌍";

    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

export function getCountryName(countries, countryCode) {
    try {
        return countries.of(countryCode)
    } catch {
        return "UNKNOWN ";
    }
}

// NOTE: every colour must be different otherwise you end up with
//       duplicated bars in one of the graphs due to the way the
//       bars are added based on the colours -- if you want two to
//       look almost the same tweak the final character up/down one
export const abuseTypeColors = {
    // these are the colors for the Nerve model
    "credibility": "#3b828a",
    "gendered_credibility": "#b2f4fa",
    "identity": "#91574e",
    "sexist": "#f4cfbe",
    "homophobic_transphobic": "#f56262",
    "racist": "#a35f44",
    "other": "#e19392",  // should be general but hey ho
    "beliefs": "#e69138",
    "religious": "#f0d275",
    "political": "#e6b522",
    "threats": "#8B0000",
    "death_threats": "#FF0000",
    "sexual_threats": "#E23D28",
    "sexualisation": "#f4cfbf",

    // this is for no abuse in the conversation explorer
    "none": "#c0c0c0",

    // these are the types from our original model
    // that aren't also in the new model
    "reputation": "#3b828b",
    "gendered reputation": "#b2f4fa",
    "homophobic": "#f56263",
    "general": "#e19394",
    "personal": "#e19393",
    "belief": "#e69139",
}
