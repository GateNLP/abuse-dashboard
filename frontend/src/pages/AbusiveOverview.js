import React, {useState} from "react";
import { useSelector } from "react-redux";
import Grid from "@mui/material/Grid";

import { select } from "d3-selection";

import Link from "@mui/material/Link";
import { Box, Tab, Divider, Button } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";

import LinearProgress from "@mui/material/LinearProgress";

import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory';

import ReactWordcloud from 'react-wordcloud';

import TweetTable from "../Results/TweetTable";

import Alert from '@mui/material/Alert';

import DownloadIcon from '@mui/icons-material/SaveAlt';

import useMyStyles from "../MaterialUiStyles/useMyStyles";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import Typography from "@mui/material/Typography";

import Tooltip from "@mui/material/Tooltip";
import { ReactComponent as AboutIcon } from "../images/About.svg"

import SVGDownload from '../components/buttons/SVGDownload'
import CSVDownload, {
    convertDistToCsv,
    convertObjToCsv,
    convertStringTopicsToCsv,
    convertMultiObjToCsv,
    convertSunburstToCsv,
    convertHeatmapToCsv
} from "../components/buttons/CSVDownload";
import Status from "../Status";

import {getISODate, calcMaxY, getPlotHeight} from "../api";

import { useTranslation } from "react-i18next";

import PDFReport from "../components/buttons/PDFReport"
import { ChordDiagram } from "../Results/ChordDiagram";

import dayjs from "dayjs";

const Plot = createPlotlyComponent(Plotly);

const AbusiveOverview = (props) => {

    const { t, i18n } = useTranslation()

    const classes = useMyStyles();

    const tabs = props.tabs || null;
    const addToQuery = props.addToQuery;
    const addToReport = props.addToReport;

    const [value, setValue] = React.useState('0');

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);
    const complianceMode = useSelector((state) => state.dashboard.settings.complianceMode);
    const maxCSVRows = useSelector((state) => state.dashboard.settings.maxCSVRows);
    const events = useSelector((state) => state.dashboard.events);

    // tweet table display options
    const[displayOriginals, setDisplayOriginals] = useState(true)
    const[displayReplies, setDisplayReplies] = useState(true)

    const tweetDisplayOptions = {
        displayOriginal: displayOriginals,
        displayReply: displayReplies,
        updateOriginal: setDisplayOriginals,
        updateReply: setDisplayReplies
    }

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    const options = {
        rotations: 1,
        rotationAngles: [0],
        fontSizes: [11.25, 45],
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        enableOptimizations: true,
        deterministic: true,
        colors: ["#ffffff", "#d5fbfb", "#abf7f7", "#81f2f2", "#57eeee"]
    };

    const overview = useSelector(state => state.abusive.abusive);
    const triggers = useSelector(state => state.abusive.triggers);
    const wholeIndex = useSelector(state => state.dashboard.overview);
    const user = useSelector(state => state.dashboard.user);

    const loading = useSelector(state => state.abusive.loading);
    const done = useSelector(state => state.abusive.done);
    const failed = useSelector(state => state.abusive.failed);


    if (loading) {
        return ( <LinearProgress/> )
    }
    else if (failed) {
        return  <Status message={t("dashboard.abusiveError")}/>
    }

    var xaxisStart = "";
    var xaxisEnd = "";

    overview.timeline.forEach(entry => {
        entry.name = t("dashboard.overview.timeline."+entry.label);
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    const organicCloud = [];
    // ... push the data into it and finally...
    Object.keys(overview.all.hashtags).forEach(hashtag => {
        organicCloud.push({ text: hashtag, value: overview.all.hashtags[hashtag] })
    });

    const organicAbuseCloud = [];
    Object.keys(overview.all.abuse_strings).forEach(phrase => {
        organicAbuseCloud.push({ text: phrase, value: overview.all.abuse_strings[phrase] })
    });

    const timelineMax = calcMaxY(overview.timeline);

    var graphStart = overview.from;

    // a nasty hack to hide away stuff in the timeline that's got no date (I
    // think this is mainly from the Malta data)
    if (overview.timeline.length > 0 && overview.timeline[0].label === "other" && overview.timeline[0].x[0] === "1970-01-01") {
        for (var i = 1 ; i < overview.timeline[0].y.length ; ++i) {
            if (overview.timeline[0].y[i] > 0) {
                graphStart = overview.timeline[0].x[i-1];
                break;
            }
        }
    }

    let layout = {
        barmode: "stack",
        // if each bar represents 24 hours, set the gap between bars equal to three
        // hours (so one eighth of the width is gap and seven eighths is bar)
        bargap: 0.125,
        autosize: true,
        showlegend: true,
        legend: {
            "orientation": "h",
            x: 1,
            xanchor: 'right',
            y: 1.1,
            traceorder: 'normal'
        },
        yaxis: { fixedrange: true, range: [0, timelineMax] },
        margin: {
            t: 60,
            b: 30
        },
        xaxis: {
            range: [graphStart, dayjs(overview.to).add(1, "day").toISOString()],
            ticklabelmode: "period",
            ticks: "outside",
            tickformatstops: [{
                "dtickrange": [null, "M1"],
                "value": "%e %b %Y",
              },
              {
                "dtickrange": ["M1", "M12"],
                "value": "%b %Y"
              },
              {
                "dtickrange": ["M12", null],
                "value": "%Y"
              }
            ]
        },
        shapes: events,
    }

    const legend_for_abusive_topics = {}

    let all_headings = Object.values(overview.all.abuse_topics).flatMap(topic=>Object.keys(topic))
    all_headings.sort()
    let set_headings = new Set(all_headings)

    let colour_count = 0
    let choice_of_colors = [
        '#66c5cc', '#f6cf71', '#b6b5b5', '#b497e7',
        '#f89c74', '#8be0a4', '#dcb0f2', '#c9db74',
        '#9e5a5a', '#1dcd96', '#c77572', '#7678a1'
    ]

    set_headings.forEach(heading=>{
        legend_for_abusive_topics[heading]=choice_of_colors[colour_count]
        colour_count +=1
    })

    const abuseTopicsUnique = {

    };

    const totalForOrganicTopics = []

    Object.entries(overview.all.abuse_topics).forEach(abuse => {
        totalForOrganicTopics.push({
            y: abuse[0],
            x: Object.values(abuse[1]).reduce((pv, cv)=>pv+cv, 0) + 50,
            text: Object.values(abuse[1]).reduce((pv, cv)=>pv+cv, 0),
            showarrow: false
        })

        Object.keys(abuse[1]).forEach(topic => {

            //topic = t("dashboard.overview.topics."+topic);

            var atData = abuseTopicsUnique[topic];

            if (atData === null || atData === undefined) {
                atData = {
                    id: topic,
                    orientation: 'h',
                    type: "bar",
                    x: [],
                    y: []
                };

                abuseTopicsUnique[topic] = atData;
            }
        });
    });

    delete abuseTopicsUnique.other

    /*abuseTopicsUnique["other"] = {
        id: "other",
        orientation: 'h',
        type: "bar",
        x: [],
        y: []
    };*/

    Object.keys(overview.all.abuse_topics).reverse().forEach(abuse => {
        Object.values(abuseTopicsUnique).forEach(topic => {
            var value = overview.all.abuse_topics[abuse][topic.id];
            topic.marker = {color: legend_for_abusive_topics[topic.id]}
            topic.x.push(value !== undefined && value !== null ? value : 0);
            topic.y.push(abuse);
            topic.name = t("dashboard.overview.topics."+topic.id);
        });
    });


    const updateAbuseTopicsOrganic = {
        layout: true,
        annotations: totalForOrganicTopics
    }

    const resetAbuseTopicsOrganic = {
        layout: true,
        annotations: null
    }

    const languages = new Intl.DisplayNames([i18n?.language || "en"], { type: 'language' });

    function describeLanguage(lang) {

        var key = "dashboard.lang."+lang;

        if (i18n.exists(key)) return t(key);

        return languages.of(lang);
    }

    const allLang = {
        name: "All Tweets",
        type: "pie",
        labels: Array.from(Object.keys(overview.all.languages)).slice(0, 5).map(function (i) { return describeLanguage(i); }),
        values: Array.from(Object.values(overview.all.languages)).slice(0, 5),
        codes: Array.from(Object.keys(overview.all.languages)).slice(0, 5),
        sort: false,
        direction: "clockwise"
    };

    var otherLanguages = Array.from(Object.values(overview.all.languages)).slice(5).reduce((partialSum, a) => partialSum + a, 0); 

    if (otherLanguages > 0) {
        allLang.labels.push(t("dashboard.lang.other"));
        allLang.values.push(otherLanguages);
    }

    const organicTopics = {
        name: "Unique Tweets",
        marker: {
            color: "#3a7b8d",
        },
        type: "bar",
        orientation: 'h',
        y: Array.from(Object.keys(overview.all.topics)).slice(0,20).reverse().map(function (i) { return t("dashboard.overview.topics."+i) }),
        x: Array.from(Object.values(overview.all.topics)).slice(0,20).reverse()
    };

    const organicTopicsUpdate = {
        text: [Array.from(Object.values(overview.all.topics)).slice(0,20).reverse().map(count=>count.toLocaleString())]
    };

    const organicTopicsReset = {
        text: null
    }

    const asc = {
        "reputation": "#3b828a",
        "gendered reputation": "#b2f4fa",
        "sexist": "#f4cfbe",
        "sexual": "#f4cfbe",
        "homophobic": "#f56262",
        "racist": "#a35f44",
        "general": "#e19392",
        "personal": "#e19392",
        "religious": "#f0d275",
        "political": "#e6b522"
    };

    const legend = {
        "reputation": "#3b828a",
        "gendered reputation": "#b2f4fa",
        "sexist": "#f4cfbe",
        "homophobic": "#f56262",
        "racist": "#a35f44",
        "religious": "#f0d275",
        "political": "#e6b522",
        "general": "#e19392",
    }

    var chordColors = [];

    if (overview.all.abuse_types_intersection?.x) {
        overview.all.abuse_types_intersection.x.forEach((item) => {
            if (item === "personal")
                chordColors.push("#91574e");
            else if (item === "reputation")
                chordColors.push("#3b828a");
            else if (item === "sexist and explicit")
                chordColors.push("#f4cfbe")
            else
                chordColors.push(legend[item]);
        });
    }

    const genLegendFriendlyAbuseDetails = (originalStructure) => {
        let organicAbuseStringsUpdate = []

        // create a plot ("trace") per legend category you want, with the right legend colour as the marker
        let organicAbuseStringsLegend  = Object.entries(legend).map((entry)=>{return {
            name: t("dashboard.overview.abuse_types."+entry[0]),
            marker: {color: entry[1]},
            type: "bar",
            orientation: "h"
        }})

        /* go through each of these new traces. for each once, get the the x and y values from the original structure  where
        the marker colour for the point matches the marker colour of the current trace. put these points in this trace's x/y values */

        Object.values(organicAbuseStringsLegend).forEach(graph=>{
            graph.x = originalStructure.marker.color
                .reduce((running_result, colour, curr_index) => {
                    if (colour === graph.marker.color) running_result.push(curr_index);
                    return running_result.length > 0 ? running_result : []
                }, [])
                .map(indexOfCount=>originalStructure.x[indexOfCount])

            graph.y = originalStructure.marker.color
                .reduce(function(running_result, colour, curr_index) {
                    if (colour === graph.marker.color) running_result.push(curr_index);
                    return running_result.length > 0 ? running_result : [] ;}, [])
                .map(indexOfString=>originalStructure.y[indexOfString])

            // also add an array of this plot's x values to the organicAbuseStringsUpdate array.
            // necessary in this form for the update to show these values on the graph itself before download
            organicAbuseStringsUpdate.push(graph.x)
        })
        
        // instead of putting null in the array if runing_result.length was 0 we return an empty array and then
        // filter out those graphs with no x values before returning them. This means the legend now only
        // contains the relevant items, and we still draw the vertical x value lines correctly (which we didn't
        // if we returned the empty list but didn't filter)
        return [organicAbuseStringsLegend.filter(graph => graph.x.length > 0), organicAbuseStringsUpdate.filter(x => x.length > 0)]
    }

    Object.keys(overview.all.abuse_string_types).filter(key => overview.all.abuse_string_types[key] === "sexual").forEach((key) => {
        overview.all.abuse_string_types[key] = "sexist";
    });

    const organicAbuseStrings = {
        name: "Unique Tweets",
        marker: {
            color: Array.from(Object.values(overview.all.abuse_string_types)).slice(0, 20).reverse().map(s => asc[s]),
        },
        type: "bar",
        orientation: 'h',
        category: Array.from(Object.values(overview.all.abuse_string_types)).slice(0, 20).reverse(),
        y: Array.from(Object.keys(overview.all.abuse_strings)).slice(0, 20).reverse(),
        x: Array.from(Object.values(overview.all.abuse_strings)).slice(0, 20).reverse()
    }

    // generate a legend friendly: graph, graph order and graph update
    const organicAbuseStringsLegendFriendly = genLegendFriendlyAbuseDetails(organicAbuseStrings)

    const organicAbuseStringsL = organicAbuseStringsLegendFriendly[0]

    const organicAbuseStringsUpdate = organicAbuseStringsLegendFriendly[1]
    const organicAbuseStringsOrder = organicAbuseStrings.y

    const organicAbuseUpdate = {
        text: organicAbuseStringsUpdate
    };

    const organicAbuseReset = {
        text: null
    }

    // these are ordered credibility, personal, belief
    const abuseTypeColors = ["#3b828a", "#91574e", "#e69138"];


    const recolor = (graphDiv) => {
        var div = select(graphDiv);

        colourSegment(div, t("dashboard.overview.abuse_types.religious"), "#f7df3e");
        colourSegment(div, t("dashboard.overview.abuse_types.political"), "#e6b522");
        colourSegment(div, t("dashboard.overview.abuse_types.homophobic"), "#f56262");
        colourSegment(div, t("dashboard.overview.abuse_types.racist"), "#a35f44");
        colourSegment(div, t("dashboard.overview.abuse_types.sexist"), "#f4cfbe");
        colourSegment(div, t("dashboard.overview.abuse_types.gendered reputation"), "#b2f4fa");
        colourSegment(div, t("dashboard.overview.abuse_types.general"), "#e19392");

    };

    const colourSegment = (div, name, color) => {
        var political = div.select("text[data-unformatted*='" + name + "']");

        var path = select(political?.node()?.parentNode?.parentNode)?.select("path");

        if (path !== null) path.style("fill", color);
    }

    const organicAbuseTypes = {
        name: "",
        type: "sunburst",
        hoverinfo: "label+value+percent parent+percent root",
        hovertemplate: "%{label}<br>%{value}<br>%{percentParent:.2%} of %{parent}<br>%{percentRoot:.2%} of %{root}",
        ids: overview.all.abuse_types_sunburst.ids,
        labels: [],//overview.all.abuse_types_sunburst.labels,
        values: overview.all.abuse_types_sunburst.values,
        parents: overview.all.abuse_types_sunburst.parents,
        sort: false,
        branchvalues: "total",
        leaf: { opacity: 1 },
        textfont: { color: "black" }
    }

    organicAbuseTypes.ids.forEach(type => {
        organicAbuseTypes.labels.push(t("dashboard.overview.abuse_types."+type));
    });

    overview.all.abuse_types_sunburst.labels = organicAbuseTypes.labels;

    const sunburstUpdate = {
        text: "label+value",
        texttemplate: "%{label}, %{value}"
    }

    const sunburstReset = {
        text: null,
        texttemplate: null
    }

    function getCallback(callback) {
        return function (word, event) {
            const isActive = callback !== "onWordMouseOut";
            const element = event.target;
            const text = select(element);
            text
                .on("click", () => {
                    if (isActive) {
                        props.addToQuery(word.text,"hashtag");
                    }
                })
                .transition()
                .attr("font-weight", isActive ? "bold" : "normal");
        };
    }

    const callbacks = {
        onWordClick: getCallback("onWordClick"),
        onWordMouseOut: getCallback("onWordMouseOut"),
        onWordMouseOver: getCallback("onWordMouseOver")
    }

    if (overview.all.count === 0) {
        return ( <Alert severity="info">{t("dashboard.overview.no_abuse", {from: overview.from, to: overview.to, user: user.name})}</Alert>)
    }

    const overviewDescription = [];

    overviewDescription.push(
        t("dashboard.overview.stats_abusive.unique", {posts: overview.all.count.toLocaleString(), authors: overview.all.tweet_authors.toLocaleString()}) +
        " " + t("dashboard.reports.abuseOverview", {originals: overview.tweet_kind.original.toLocaleString(), replies: triggers.abusive_replies.toLocaleString(), other: (overview.tweet_kind.reply - triggers.abusive_replies).toLocaleString()})
    )

    if (Object.keys(overview.all.platforms).length > 1) {
        overviewDescription.push(
            t("dashboard.overview.stats_abusive.platforms") + " " +
            Object.entries(overview.all.platforms).map(([key, value]) => {
                return key + " ("+value.toLocaleString()+", "+(100*value/overview.all.count).toFixed(2)+"%)"
            }).join(", ")
        )
    }

    overviewDescription.push(
        t("dashboard.reports.abusePosts", {percentage: (100 * overview.all.count / (wholeIndex.all.count - wholeIndex.focus.total)).toFixed(2)})
    )

    overviewDescription.push(
        t("dashboard.reports.abuseReplies", {percentage: (100 * triggers.abusive_replies / triggers.all_replies).toFixed(2)})
    )

    return (
        (<Box mt={3}>
            {done && !failed ? <React.Fragment>
            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="abuseSummary"
            >

                <Grid item xs={12}  data-cy="abuseHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.date_range", {from: overview.from, to: overview.to})} <PDFReport type="text" title={"Abuse Overview Statistics"} addToReport={addToReport} lines={overviewDescription}/></Typography>
                </Grid>

                <Grid p={2} item xs={4} data-cy="overviewTotalTweets">
                    
                    {t("dashboard.overview.stats_abusive.unique", {posts: overview.all.count.toLocaleString(), authors: overview.all.tweet_authors.toLocaleString()})}
                    <ul>
                        <li data-cy="abusiveOriginals">{t("dashboard.overview.stats_abusive.originals")}: {overview.tweet_kind.original.toLocaleString()}</li>
                        <li data-cy="abusiveRepliesTo">{t("dashboard.overview.stats_abusive.replies_to")}: {triggers.abusive_replies.toLocaleString()}</li>
                        <li data-cy="abusiveRepliesOther">{t("dashboard.overview.stats_abusive.replies_other")}: {(overview.tweet_kind.reply - triggers.abusive_replies).toLocaleString()}</li>
                    </ul>
                </Grid>

                <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "0px" }} />

                <Grid p={2} item xs={4}  data-cy="abuseTweetsRetweets">
                    {t("dashboard.overview.stats_abusive.selected_total", {percentage: (100 * overview.all.count / (wholeIndex.all.count - wholeIndex.focus.total)).toFixed(2)})}
                    <ul>
                        <li data-cy="datasetSize">{t("dashboard.overview.stats_abusive.selected_all")}: {wholeIndex.all.count.toLocaleString()}</li>
                        <li data-cy="tweetsByFocus">{t("dashboard.overview.stats_abusive.selected_by")}: {wholeIndex.focus.total.toLocaleString()}</li>
                    </ul>
                    {t("dashboard.overview.stats_abusive.selected_other", {posts: (wholeIndex.all.count - wholeIndex.focus.total).toLocaleString()})}
                </Grid>

                <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "0px" }} />

                {wholeIndex.focus.total > 0 && <Grid p={2} item xs={4}  data-cy="abuseReplies">
                    {t("dashboard.overview.stats_abusive.all_replies_to_total", {percentage: (100 * triggers.abusive_replies / triggers.all_replies).toFixed(2)})}
                    <ul>
                        <li data-cy="allRepliesTo">{t("dashboard.overview.stats_abusive.all_replies_to")}: {triggers.all_replies.toLocaleString()}</li>
                        <li data-cy="abusiveRepliesToFocus">{t("dashboard.overview.stats_abusive.all_replies_to_abusive")}: {triggers.abusive_replies.toLocaleString()}</li>
                    </ul>

                </Grid>}

            </Grid>

            <Box mt={5} />

            {overview.from.toLocaleDateString() !== overview.to.toLocaleDateString() && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start">

                <Grid item xs={12} data-cy="abuseHistogram">
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.overview.distribution_abusive", {from: overview.from, to: overview.to})}
                        <SVGDownload id="tweets-over-time" filename="abusive-tweets-over-time.svg" />
                        <SVGDownload id="tweets-over-time" filename="abusive-tweets-over-time.png" type="PNG" />
                        <CSVDownload filename="abusive-tweets-over-time" method={convertDistToCsv(overview.timeline, ["type", "date", "count"])} />
                        <PDFReport title={t("dashboard.overview.distribution_abusive", {from: overview.from, to: overview.to})} id="tweets-over-time" addToReport={props.addToReport}/>
                        <Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(xaxisStart, xaxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button></Typography>
                    <Plot divId="tweets-over-time" style={{ width: "100%", height: 450 }} data={overview.timeline} layout={layout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }} onRelayout={(event) => { xaxisStart = event["xaxis.range[0]"]; xaxisEnd = event["xaxis.range[1]"] }} />
                </Grid>
            </Grid>}

            <Box mt={5} />

            {organicCloud.length > 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start">

                <Grid item xs={12}  data-cy="abuseHashtagsHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.hashtags_abusive", {from: overview.from, to: overview.to})}</Typography>
                </Grid>

                <Grid p={0} item xs={12} data-cy="abuseHashtagsOrganic" >
                    <SVGDownload id="cloud-organic" filename="hashtags-abusive-originals-and-replies.svg" fill fixBBox={false} />
                    <SVGDownload id="cloud-organic" filename="hashtags-abusive-originals-and-replies.png" type="PNG" fill fixBBox={false} />
                    <CSVDownload filename="hashtags-abusive-originals-and-replies" method={convertObjToCsv(overview.all.hashtags, ["hashtag", "count"])} />
                    <PDFReport title={t("dashboard.overview.hashtags_abusive", {from: overview.from, to: overview.to})} id="cloud-organic" fill addToReport={props.addToReport}/>
                    <ReactWordcloud style={{ height: 400, background: "#3a858d" }} id="cloud-organic" words={organicCloud} options={options} callbacks={callbacks} />
                </Grid>
            </Grid>}

            <Box mt={5} />

            {Object.keys(overview.all.topics).length !== 0 ?
                <React.Fragment>

                    <Grid component={Paper}
                        container
                        direction="row"
                        p={2}
                        alignItems="flex-start"
                        data-cy="abuseTopics">

                        <Grid item xs={12} data-cy="abuseTopicsHeader">
                            <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.topics_abusive", {from: overview.from, to: overview.to})}</Typography>
                        </Grid>

                        <Grid p={0} item xs={12} data-cy="abuseTopicsOrganic" >
                            <SVGDownload id="topics-organic" filename={"topics-abusive-originals-and-replies.svg"} prepareImage={organicTopicsUpdate} resetImage={organicTopicsReset}/>
                            <SVGDownload id="topics-organic" filename={"topics-abusive-originals-and-replies.png"} type="PNG" prepareImage={organicTopicsUpdate} resetImage={organicTopicsReset}/>
                            <CSVDownload filename={"topics-abusive-originals-and-replies"} method={convertObjToCsv(overview.all.topics, ["topic", "count"])} />
                            <PDFReport title={t("dashboard.overview.topics_abusive", {from: overview.from, to: overview.to})} id="topics-organic" addToReport={props.addToReport}/>
                            <Plot onClick={(e) => addToQuery(e.points[0].label, "topic")} divId="topics-organic" style={{ width: "100%" }} data={[organicTopics]} layout={{ margin: { t: 10, b: 20, l: 250 }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", xaxis: { fixedrange: true }, yaxis: { fixedrange: true }, height: getPlotHeight(organicTopics) }} config={{ responsive: true, 'displayModeBar': false }} />
                        </Grid>

                    </Grid>

                    <Box mt={5} />
                </React.Fragment>
                : null}

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="abusePhrases">

                <Grid item xs={12} data-cy="abusePhrasesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.abusive_phrases", {from: overview.from, to: overview.to})} <Tooltip title={t("dashboard.overview.tooltip.abusePhrases",{user: user.name})}><AboutIcon style={{ float: "right", fill: "black", height: "1.5em", width: "1.5em", verticalAlign: "text-bottom" }} /></Tooltip></Typography>
                </Grid>

                <Grid p={0} item xs={12} data-cy="abusePhrasesOrganic" >
                    <SVGDownload id="abuse-strings-organic" filename="abusive-phrases-originals-and-replies.svg" prepareImage={organicAbuseUpdate} resetImage={organicAbuseReset}/>
                    <SVGDownload id="abuse-strings-organic" filename="abusive-phrases-originals-and-replies.png" type="PNG" prepareImage={organicAbuseUpdate} resetImage={organicAbuseReset}/>
                    <CSVDownload filename="abusive-phrases-originals-and-replies" method={convertMultiObjToCsv(overview.all.abuse_string_types, overview.all.abuse_strings, ["abuse phrase", "abuse type", "count"])}/>
                    <PDFReport title={t("dashboard.overview.abusive_phrases", {from: overview.from, to: overview.to})} id="abuse-strings-organic" addToReport={props.addToReport}/>
                    <Plot divId="abuse-strings-organic" style={{ width: "100%" }} data={organicAbuseStringsL} layout={{ margin: { t: 10, b: 20, l: 150 }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", xaxis: { fixedrange: true}, yaxis: { fixedrange: true,  categoryorder: "array", categoryarray: organicAbuseStringsOrder }, height: getPlotHeight(organicAbuseStrings) }} config={{ responsive: true, 'displayModeBar': false }} />
                </Grid>

                <Box m={2}/>

            </Grid>

            <Box mt={5} />

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="abusePhrases100">

                <Grid item xs={12}>
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.abusive_phrase_cloud", {from: overview.from, to: overview.to})}</Typography>
                </Grid>

                <Grid p={0} item xs={12} data-cy="abusePhrasesCloudOrganic">
                    <SVGDownload id="cloud-abuse-organic" filename="cloud-abusive-phrases-originals-and-replies.svg"  fill fixBBox={false} />
                    <SVGDownload id="cloud-abuse-organic" filename="cloud-abusive-phrases-originals-and-replies.png" type="PNG" fill fixBBox={false} />
                    <CSVDownload filename="cloud-abusive-phrases-originals-and-replies" method={convertObjToCsv(overview.all.abuse_strings, ["abuse phrase", "count"])} />
                    <PDFReport title={t("dashboard.overview.abusive_phrase_cloud", {from: overview.from, to: overview.to})} id="cloud-abuse-organic" fill addToReport={props.addToReport}/>
                    <ReactWordcloud style={{ height: 400, background: "#3a858d" }} id="cloud-abuse-organic" words={organicAbuseCloud} options={options} callbacks={callbacks} />
                </Grid>

            </Grid>

            <Box mt={5} />

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="abuseType">

                <Grid item xs={12} data-cy="abuseTypeHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.abusive_types", {from: overview.from, to: overview.to})} <Tooltip title={t("dashboard.overview.tooltip.abuseTypes",{user:user.name})}><AboutIcon style={{ float: "right", fill: "black", height: "1.5em", width: "1.5em", verticalAlign: "text-bottom" }} /></Tooltip></Typography>
                </Grid>

                <Grid p={0} item xs={12} data-cy="abuseTypeOrganic">
                    <SVGDownload id="abuse-types-organic" filename="abuse-types-originals-and-replies.svg"  prepareImage={sunburstUpdate} resetImage={sunburstReset}/>
                    <SVGDownload id="abuse-types-organic" filename="abuse-types-originals-and-replies.png" type="PNG" prepareImage={sunburstUpdate} resetImage={sunburstReset} />
                    <CSVDownload filename="abuse-types-originals-and-replies" method={convertSunburstToCsv(overview.all.abuse_types_sunburst, ["type of abuse", "subtype of", "count"])} />
                    <PDFReport title={t("dashboard.overview.abusive_types", {from: overview.from, to: overview.to})} id="abuse-types-organic" addToReport={props.addToReport}/>
                    <Plot divId="abuse-types-organic" style={{ width: "100%", height:"40vw", whiteSpace: "pre-line" }} data={[organicAbuseTypes]} layout={{ sunburstcolorway: abuseTypeColors, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, margin: { t: 10, b: 20, l: 5, r: 5 }, autosize: true }} config={{ responsive: true, 'displayModeBar': false }} onUpdate={(figure, graphDiv) => { recolor(graphDiv); }} onInitialized={(figure, graphDiv) => { recolor(graphDiv); }} />
                </Grid>
            </Grid>

            <Box mt={5} />

            {overview.all.abuse_types_intersection?.x?.length > 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="abuseType">

                <Grid item xs={12} data-cy="abuseTypeHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.abusive_overlap", {from: overview.from, to: overview.to})}
                        <SVGDownload id="abuse-intersection-organic" filename="abuse-intersection.svg" />
                        <SVGDownload id="abuse-intersection-organic" type="PNG" filename="abuse-intersection.png" />
                        <CSVDownload filename="abuse-intersection.csv" method={convertHeatmapToCsv(overview.all.abuse_types_intersection, ["server", "count"])} />
                        <PDFReport title={t("dashboard.overview.abusive_overlap", {from: overview.from, to: overview.to})} id="abuse-intersection-organic" addToReport={props.addToReport}/>
                    </Typography>
                </Grid>

                <Grid item xs={6} data-cy="abuseIntersection">
                    <Plot  onClick={(e) => addToQuery([e.points[0].x,e.points[0].y],"intersection")} divId="abuse-intersection-organic" style={{ width: "100%", height:"40vw" }} data={[overview.all.abuse_types_intersection]} layout={{ margin: { t: 10, b: 300, l: 150, r: 50 }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true }} config={{ responsive: true, 'displayModeBar': false }}  />
            </Grid>

                <Grid item xs={12}>
                    <Typography variant={"body1"}>{t("dashboard.overview.abusive_chord")}
                <SVGDownload id="intersection-chord" filename="abuse-intersection-chord.svg" />
                        <SVGDownload id="intersection-chord" type="PNG" filename="abuse-intersection-chord.png" />
                         <PDFReport title={t("dashboard.overview.abusive_overlap", {from: overview.from, to: overview.to})} id="intersection-chord" addToReport={props.addToReport}/>
                        </Typography>
                    <ChordDiagram divId="intersection-chord" data={overview.all.abuse_types_intersection.z}
      width={"100%"}
      height={500}
      groups={overview.all.abuse_types_intersection.x}
      COLORS={chordColors}
    />
                </Grid>
            </Grid>}

            <Box mt={5}/>

            {Object.keys(overview.all.topics).length !== 0 ?
                <React.Fragment>

                    <Grid component={Paper}
                        container
                        direction="row"
                        p={2}
                        alignItems="flex-start"
                        data-cy="abuseST">

                        <Grid item xs={12} data-cy="abuseStringTopicsHeader">
                            <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.abusive_strings_topics", {from: overview.from, to: overview.to})}</Typography>
                        </Grid>

                        <Grid p={0} item xs={12} data-cy="abuseSTOrganic">
                            <SVGDownload id="abuse-sVt-organic" filename="abuse-strings-topics-originals-and-replies.svg" prepareImage={updateAbuseTopicsOrganic} resetImage={resetAbuseTopicsOrganic} />
                            <SVGDownload id="abuse-sVt-organic" filename="abuse-strings-topics-originals-and-replies.png" type="PNG" prepareImage={updateAbuseTopicsOrganic} resetImage={resetAbuseTopicsOrganic} />
                            <CSVDownload filename="abuse-strings-topics-originals-and-replies" method={convertStringTopicsToCsv(overview.all.abuse_topics)} />
                            <PDFReport title={t("dashboard.overview.abusive_strings_topics", {from: overview.from, to: overview.to})} id="abuse-sVt-organic" addToReport={props.addToReport}/>
                            <Plot divId="abuse-sVt-organic" style={{ width: "100%" }} data={Object.values(abuseTopicsUnique)} layout={{legend: {traceorder: 'normal'}, margin: { t: 10, b: 20, l: 150 }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'},autosize: true, barmode: "stack", xaxis: { fixedrange: true }, yaxis: { fixedrange: true }, height: getPlotHeight(abuseTopicsUnique) }} config={{ responsive: true, 'displayModeBar': false }} />
                        </Grid>
                    </Grid>

                    <Box mt={5} />
                </React.Fragment>
                : null}

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="abuseLanguages">

                <Grid item xs={12} data-cy="abuseLanguageHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.languages_abusive", {from: overview.from, to: overview.to})}
                        <SVGDownload id="languages" filename="top-5-languages-in-abusive-tweets.svg" />
                        <SVGDownload id="languages" filename="top-5-languages-in-abusive-tweets.png" type="PNG" />
                        <CSVDownload filename="top-languages-in-abusive-tweets" method={convertObjToCsv(overview.all.languages, ["language", "count"])} />
                        <PDFReport title={t("dashboard.overview.languages_abusive", {from: overview.from, to: overview.to})} id="languages" fill addToReport={props.addToReport}/>
                        <Tooltip title={t("dashboard.overview.tooltip.lang")}><AboutIcon style={{ float: "right", fill: "black", height: "1.5em", width: "1.5em", verticalAlign: "text-bottom" }} /></Tooltip>
                    </Typography>
                </Grid>

                <Grid item xs={6} data-cy="abuseLanguagePie">
                    <Plot divId="languages" style={{ width: "100%" }} data={[allLang]} layout={{ margin: { }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", xaxis: { fixedrange: true }, yaxis: { fixedrange: true } }} config={{ responsive: false, 'displayModeBar': false }} />
                </Grid>

                <Grid p={2} item xs={6} data-cy="abuseLanguagesTable">
                    <TableContainer component={Paper}>
                        <Table data-cy="abuseLanguageTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                <TableCell>{t("dashboard.overview.language")}</TableCell>
                                    <TableCell>{t("dashboard.overview.tweetPercent")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allLang.labels.map((lang, key) => (
                                    <TableRow key={key} data-cy={"language-"+key}>
                                        {allLang.codes[key] === undefined ? <TableCell>{lang}</TableCell> : <TableCell><Link
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); props.addToQuery(allLang.codes[key],"language"); }}
                                            underline="hover">{lang}</Link></TableCell>}
                                        <TableCell>{allLang.values[key].toLocaleString()} ({(100 * allLang.values[key] / overview.all.count).toFixed(2)}%)</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>

            <Box mt={5} />

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="abuseTweetTable">

                <Grid item xs={12}>
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.tweets_abusive", {from: overview.from, to: overview.to})}
                        <Link
                            title={maxCSVRows !== 0 ? t("dashboard.overview.download_first_abusive", {posts: maxCSVRows}) : t("dashboard.overview.download_all_abusive")}
                            href={"./tweets.csv?abusive=true&sort=" + value
                            + "&query=" + encodeURIComponent(props.query || "")
                            + "&from=" + encodeURIComponent(getISODate(new Date(props.from)))
                            + "&to=" + encodeURIComponent(getISODate(new Date(props.to)))
                            + "&total=" + maxCSVRows
                            + "&filterID=" + props.filterID}
                            download={encodeURIComponent([user.screen_name, overview.from.toLocaleDateString(), overview.from.toLocaleDateString(), "abusive", "tweets", "by", ["date", "retweets", "replies", "favorites"][parseInt(value)]].join("_")) + ".csv"}
                            underline="hover"><DownloadIcon style={{ verticalAlign: "middle" }} /></Link>
                    </Typography>
                </Grid>

                <Grid item xs={12} data-cy="abuseTweetTableOrderBy">
                    <Box sx={{ width: '100%', typography: 'body1' }}>
                        <TabContext value={value}>
                            <Box sx={{ borderBottom: 1, borderColor: 'silver' }}>
                                <TabList onChange={handleChange}>
                                    <Tab label={t("dashboard.overview.order.date")} value="0" />
                                </TabList>
                            </Box>
                            <TabPanel value="0"><TweetTable addToReport={addToReport} addToQuery={addToQuery} tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} abusive="true" query={props.query} filter={props.filter} from={props.from} to={props.to} sort="0" displayOptions={tweetDisplayOptions} /></TabPanel>
                            <TabPanel value="1"><TweetTable addToReport={addToReport} addToQuery={addToQuery} tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} abusive="true" query={props.query} filter={props.filter} from={props.from} to={props.to} sort="1" displayOptions={tweetDisplayOptions}/></TabPanel>
                            <TabPanel value="2"><TweetTable addToReport={addToReport} addToQuery={addToQuery} tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} abusive="true" query={props.query} filter={props.filter} from={props.from} to={props.to} sort="2" displayOptions={tweetDisplayOptions}/></TabPanel>
                            <TabPanel value="3"><TweetTable addToReport={addToReport} addToQuery={addToQuery} tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} abusive="true" query={props.query} filter={props.filter} from={props.from} to={props.to} sort="3" displayOptions={tweetDisplayOptions}/></TabPanel>
                        </TabContext>
                    </Box>
                </Grid>

            </Grid>
            </React.Fragment> : null }
        </Box>)
    );
}

export default AbusiveOverview;