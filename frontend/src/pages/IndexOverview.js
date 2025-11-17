import React, {useState} from "react";
import { useSelector } from "react-redux";

import { select } from "d3-selection";

import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";

import { Box, Tab, Divider, Button } from "@mui/material";
import { TabContext, TabList, TabPanel } from "@mui/lab";

import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory';

import ReactWordcloud from 'react-wordcloud';

import Alert from '@mui/material/Alert';

import TweetTable from "../Results/TweetTable";

import useMyStyles from "../MaterialUiStyles/useMyStyles";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

import Typography from "@mui/material/Typography";

import DownloadIcon from "@mui/icons-material/SaveAlt";


import {ReactComponent as FilterIcon} from "../images/Filter.svg";

import Tooltip from "@mui/material/Tooltip";
import { ReactComponent as AboutIcon } from "../images/About.svg"

import { useTranslation } from "react-i18next";

import PDFReport from "../components/buttons/PDFReport"
import SVGDownload from '../components/buttons/SVGDownload'
import CSVDownload, {
    convertDistToCsv,
    convertObjToCsv,
} from "../components/buttons/CSVDownload";

import {getISODate, calcMaxY, getPlotHeight } from "../api";

import dayjs from "dayjs";

const Plot = createPlotlyComponent(Plotly);

const IndexOverview = (props) => {


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

    const overview = useSelector(state => state.dashboard.overview);
    const user = useSelector(state => state.dashboard.user);

    // tweet table display options
    const[displayOriginals, setDisplayOriginals] = useState(true)
    const[displayReplies, setDisplayReplies] = useState(true)

    const tweetDisplayOptions = {
        displayOriginal: displayOriginals,
        displayReply: displayReplies,
        updateOriginal: setDisplayOriginals,
        updateReply: setDisplayReplies
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

    overview.focus.total = overview.focus.original + overview.focus.reply;

    const languages = new Intl.DisplayNames([i18n?.language || "en"], { type: 'language' });

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

    const timelineMax = calcMaxY(overview.timeline);

    var graphStart = overview.from;

    if (overview.timeline[0].label === "other" && overview.timeline[0].x[0] === "1970-01-01") {
        for (var i = 1 ; i < overview.timeline[0].y.length ; ++i) {
            if (overview.timeline[0].y[i] > 0) {
                graphStart = overview.timeline[0].x[i];
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
            type: "date",
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
        shapes: events
    }

    function describeLanguage(lang) {

        var key = "dashboard.lang."+lang;

        if (i18n.exists(key)) return t(key);

        return languages.of(lang);
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
        return ( <Alert severity="info">{t("dashboard.overview.none")}</Alert>)
    }

    const overviewDescription = [];

    overviewDescription.push(
        t("dashboard.overview.stats_all.unique", {posts: overview.all.count.toLocaleString(), authors:overview.all.tweet_authors.toLocaleString()}) +
        " " + t("dashboard.reports.overview", {originals: overview.tweet_kind.original.toLocaleString(), replies: overview.tweet_kind.reply.toLocaleString()})
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
        t("dashboard.reports.total", {total: overview.focus.total.toLocaleString(), original: overview.focus.original.toLocaleString(), replies: overview.focus.reply.toLocaleString()}) 
    )

    overviewDescription.push(
        // store the key and values into the report and expand the string at rendering time?
        t("dashboard.reports.other", {total: (overview.all.count - overview.focus.total).toLocaleString(), original: (overview.tweet_kind.original - overview.focus.original).toLocaleString(), replies: (overview.tweet_kind.reply - overview.focus.reply).toLocaleString(), sentTo: overview.all.to_monitored.toLocaleString() })
    )

    return (
        (<Box mt={3}>
            <Grid component={Paper}
                p={2}
                container
                direction="row"
                
                data-cy="overviewSummary"
                alignItems="flex-start">

                <Grid item xs={12} data-cy="overviewHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.date_range", {from: overview.from, to: overview.to})} <PDFReport type="text" addToReport={addToReport} title="Dataset Overview Statistics" lines={overviewDescription}/></Typography>
                </Grid>

                <Grid item xs={4} p={2} data-cy="overviewTotalTweets">
                    
                    {t("dashboard.overview.stats_all.unique", {posts: overview.all.count.toLocaleString(), authors:overview.all.tweet_authors.toLocaleString()})}
                        
                    <ul>
                        <li>{t("dashboard.overview.stats_all.originals")}: {overview.tweet_kind.original.toLocaleString()}</li>
                        <li>{t("dashboard.overview.stats_all.replies")}: {overview.tweet_kind.reply.toLocaleString()}</li>
                    </ul>

                    {Object.keys(overview.all.platforms).length > 1 && <React.Fragment>{t("dashboard.overview.platforms")}
                    <ul>
                        {Object.entries(overview.all.platforms).map(([key, value]) => {
                            return (
                                <li key={key}>{key} : {value.toLocaleString()} ({(100*value/overview.all.count).toFixed(2)}%) <Link
                                    title={`Add ${key} to dashboard filter`}
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); props.addToQuery(key,"platform"); }}
                                    underline="hover"> <FilterIcon style={{ verticalAlign: "middle", height: "0.8em" }}/></Link></li>
                            );
                        })}
                    </ul></React.Fragment>}
                </Grid>

                <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />

                <Grid item p={2} xs={4} data-cy="overviewByUser">
                    {t("dashboard.overview.stats_all.total_by", {posts: overview.focus.total.toLocaleString()})}
                    <ul>
                        <li>{t("dashboard.overview.stats_all.originals_by")}: {overview.focus.original.toLocaleString()}</li>
                        <li>{t("dashboard.overview.stats_all.replies_by")}: {overview.focus.reply.toLocaleString()}</li>
                    </ul>
                </Grid>

                <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />

                <Grid p={2} item xs={4} data-cy="overviewByOthers">
                    {t("dashboard.overview.stats_all.total_others", {posts: (overview.all.count - overview.focus.total).toLocaleString()})}
                    <ul>
                        <li>{t("dashboard.overview.stats_all.original_others")}: {(overview.tweet_kind.original - overview.focus.original).toLocaleString()}</li>
                        <li>{t("dashboard.overview.stats_all.replies_others")}: {(overview.tweet_kind.reply - overview.focus.reply).toLocaleString()}</li>
                        {<ul>
                            <li>{t("dashboard.overview.stats_all.replies_others_to")}: {overview.all.to_monitored.toLocaleString()}</li>
                            <li>{t("dashboard.overview.stats_all.replies_others_others")}: {(overview.tweet_kind.reply - overview.focus.reply - overview.all.to_monitored).toLocaleString()}</li>
                        </ul>}
                    </ul>
                </Grid>

            </Grid>
            <Box mt={5} />
            {overview.from.toLocaleDateString() !== overview.to.toLocaleDateString() && <Grid component={Paper}
                container
                direction="row"
                
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">

                <Grid item xs={12} data-cy={"histogramHeader"}>
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.overview.distribution_all", {from: overview.from, to: overview.to})}
                        <SVGDownload id="tweets-over-time" filename="tweets-over-time.svg"/>
                        <SVGDownload id="tweets-over-time" type="PNG" filename="tweets-over-time.png"/> <Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(xaxisStart, xaxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button>
                        <CSVDownload filename="tweets-over-time" method={convertDistToCsv(overview.timeline, ["type", "date", "count"])} />
                        <PDFReport title={t("dashboard.overview.distribution_all", {from: overview.from, to: overview.to})} id="tweets-over-time" addToReport={props.addToReport}/>
                    </Typography>

                    <Plot divId="tweets-over-time" style={{ width: "100%", height: 450 }} data={overview.timeline} layout={layout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }} onRelayout={(event) => { xaxisStart = event["xaxis.range[0]"]; xaxisEnd = event["xaxis.range[1]"] }} />
                </Grid>
            </Grid>}
            <Box mt={5} />
            {organicCloud.length > 0 && <Grid component={Paper}
                container
                p={2}
                direction="row"
                alignItems="flex-start"
                data-cy="overviewHashtags">

                <Grid item xs={12} data-cy="hashtagsHeader" >
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.hashtags_all", {from: overview.from, to: overview.to})}</Typography>
                </Grid>

                <Grid p={0} item xs={12} data-cy="hashtagsOrganic">
                    <SVGDownload id="cloud-organic" filename="hashtags-originals-and-replies.svg" fill fixBBox={false} />
                    <SVGDownload id="cloud-organic" type="PNG" filename="hashtags-originals-and-replies.png" fill fixBBox={false} />
                    <CSVDownload filename="hashtags-originals-and-replies" method={convertObjToCsv(overview.all.hashtags, ["hashtag", "count"])} />
                    <PDFReport title={t("dashboard.overview.hashtags_all", {from: overview.from, to: overview.to})} id="cloud-organic" fill addToReport={props.addToReport}/>
                    <ReactWordcloud style={{ height: 400, background: "#3a858d" }} id="cloud-organic" words={organicCloud} options={options} callbacks={callbacks} />
                </Grid>
            </Grid> }
            <Box mt={5} />
            {Object.keys(overview.all.topics).length !== 0 ?
                <React.Fragment>
                    <Grid component={Paper}
                        container
                        p={3}
                        direction="row"
                        
                        alignItems="flex-start"
                        data-cy="overviewTopics">

                        <Grid item xs={12} data-cy="topicHeader">
                            <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.topics_all", {from: overview.from, to: overview.to})}</Typography>
                        </Grid>

                        <Grid item p={0} xs={12}  data-cy="topicOrganic" >
                            <SVGDownload id="topics-organic" filename={"topics-originals-and-replies.svg"} prepareImage={organicTopicsUpdate} resetImage={organicTopicsReset}/>
                            <SVGDownload id="topics-organic" type="PNG" filename={"topics-originals-and-replies.png"} prepareImage={organicTopicsUpdate} resetImage={organicTopicsReset}/>
                            <CSVDownload filename={"topics-originals-and-replies"} method={convertObjToCsv(overview.all.topics, ["topic", "count"])} />
                            <PDFReport title={t("dashboard.overview.topics_all", {from: overview.from, to: overview.to})} id="topics-organic" addToReport={props.addToReport}/>
                            
                            <Plot onClick={(e) => addToQuery(e.points[0].label, "topic")} divId="topics-organic" style={{ width: "100%" }} data={[organicTopics]} layout={{ margin: { t: 10, b: 20, l: 220 }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", height: getPlotHeight(organicTopics), xaxis: { fixedrange: true }, yaxis: { fixedrange: true } }} config={{ responsive: true, 'displayModeBar': false }} />
                        </Grid>
                    </Grid>

                    <Box mt={5} />
                </React.Fragment>
                :
                null}
            <Grid component={Paper}
                container
                p={3}
                direction="row"
                
                alignItems="flex-start"
                data-cy="overviewLanguages">

                <Grid item xs={12} data-cy="languagesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.languages_all", {from: overview.from, to: overview.to})}
                        <SVGDownload id="languages" filename="top-5-languages.svg" />
                        <SVGDownload id="languages" type="PNG" filename="top-5-languages.png" />
                        <CSVDownload filename="top-5-languages" method={convertObjToCsv(overview.all.languages, ["language", "count"])} />
                        <PDFReport title={t("dashboard.overview.languages_all", {from: overview.from, to: overview.to})} id="languages" addToReport={props.addToReport} data={{headings: ["language","count"], rows: overview.all.languages}} />
                        <Tooltip title={t("dashboard.overview.tooltip.lang")}><AboutIcon style={{ float: "right", fill: "black", height: "1.5em", width: "1.5em", verticalAlign: "text-bottom" }} /></Tooltip>
                    </Typography>
                </Grid>

                <Grid item xs={6} data-cy="languagesPlot">
                    <Plot divId="languages" style={{ width: "100%" }} data={[allLang]} layout={{ margin: { }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", xaxis: { fixedrange: true }, yaxis: { fixedrange: true } }} config={{ responsive: false, 'displayModeBar': false }} />
                </Grid>

                <Grid p={2} item xs={6} data-cy="langagesTable">
                    <TableContainer component={Paper}>
                        <Table data-cy="languageTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.overview.language")}</TableCell>
                                    <TableCell>{t("dashboard.overview.tweetPercent")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allLang.labels.map((lang, key) => (
                                    <TableRow data-cy={"language-"+key} key={key}>
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
                p={3}
                direction="column"
                
                alignItems="flex-start"
                data-cy="overviewTweetTable">

                <Grid item xs={12} data-cy="tweetTableHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.overview.tweets_all", {from: overview.from, to: overview.to})}
                        <Link
                            title={maxCSVRows !== 0 ? t("dashboard.overview.download_first", {posts: maxCSVRows}) : t("dashboard.overview.download_all")}
                            href={"./tweets.csv?abusive=false&sort=" + value
                                + "&query=" + encodeURIComponent(props.query || "")
                                + "&from=" + encodeURIComponent(getISODate(new Date(props.from)))
                                + "&to=" + encodeURIComponent(getISODate(new Date(props.to)))
                                + "&total=" + maxCSVRows
                                + "&filterID=" + props.filterID}
                            download={encodeURIComponent([user.screen_name, overview.from.toLocaleDateString(), overview.from.toLocaleDateString(), "tweets", "by", ["date", "retweets", "replies", "favorites"][parseInt(value)]].join("_")) + ".csv"}
                            underline="hover"><DownloadIcon style={{ verticalAlign: "middle" }} /></Link>
                    </Typography>
                </Grid>

                <Grid item xs={12} data-cy="tweetTableOrderBy">
                    <Box sx={{ width: '100%', typography: 'body1' }}>
                        <TabContext value={value}>
                            <Box sx={{ borderBottom: 1, borderColor: 'silver' }}> 
                                <TabList onChange={handleChange}>
                                    <Tab label={t("dashboard.overview.order.date")} value="0" />
                                </TabList>
                            </Box>
                            <TabPanel value="0"><TweetTable addToReport={addToReport} addToQuery={addToQuery} tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} abusive="false" query={props.query} filter={props.filter} from={props.from} to={props.to} sort="0" displayOptions={tweetDisplayOptions} /></TabPanel>
                        </TabContext>
                    </Box>
                </Grid>

            </Grid>
        </Box >)
    );
}

export default IndexOverview;
