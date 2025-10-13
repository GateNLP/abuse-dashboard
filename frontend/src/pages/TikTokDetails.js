import React, { useState } from "react";
import { useSelector } from "react-redux";

import { useTranslation } from "react-i18next";

import Link from "@mui/material/Link";
import { getFlagEmoji, getCountryName } from "../api";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import User from "../Results/User"

import Grid from "@mui/material/Grid";
import Paper from '@mui/material/Paper';

import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory';

import Typography from "@mui/material/Typography";

import { Box } from "@mui/material";

import Alert from '@mui/material/Alert';

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import TweetTable from "../Results/TweetTable";

import useMyStyles from "../MaterialUiStyles/useMyStyles";

import LinearProgress from "@mui/material/LinearProgress";

import PDFReport from "../components/buttons/PDFReport"
import SVGDownload from '../components/buttons/SVGDownload'
import CSVDownload, {
    convertDistToCsv,
    convertObjToCsv,
} from "../components/buttons/CSVDownload";

import { Link as PDFLink } from '@react-pdf/renderer';

import UserMenu from "../components/buttons/UserMenu"
import SourceMenu from "../components/buttons/SourceMenu"

import dayjs from "dayjs";

import ViewIcon from '@mui/icons-material/VisibilityOutlined';


import { calcMaxY, getAccountLink } from "../api";

const Plot = createPlotlyComponent(Plotly);

const TikTokDetails = (props) => {

    const { t, i18n } = useTranslation();

    const classes = useMyStyles();

    const overview = useSelector(state => state.dashboard.overview);
    const abusive = useSelector(state => state.abusive.abusive);
    const loading = useSelector(state => state.abusive.loading);

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);
    const complianceMode = useSelector((state) => state.dashboard.settings.complianceMode);

    const [openUser, setOpenUser] = React.useState(false);
    const [screenName, setScreenName] = React.useState(null);

    const tabs = props.tabs || null;

    const [tweets, setTweets] = React.useState(null);

    const handleViewTweets = (settings) => {
        setTweets({
            ...settings,
            sort: 0,
            from: overview.from,
            to: overview.to
        });
    }

    const handleCloseTweets = () => {
        setTweets(null);
    }

    const handleOpenUser = (screen_name) => {
        //e.preventDefault();
        setScreenName(screen_name);
        setOpenUser(true);
    };

    const handleCloseUser = () => {
        setOpenUser(false);
        setScreenName(null);
    };

    // tweet table display options
    const [displayOriginals, setDisplayOriginals] = useState(true)
    const [displayReplies, setDisplayReplies] = useState(true)

    const tweetDisplayOptions = {
        displayOriginal: displayOriginals,
        displayReply: displayReplies,
        updateOriginal: setDisplayOriginals,
        updateReply: setDisplayReplies
    }


    if (loading) {
        return ( <LinearProgress/> )
    }
/*
    overview.twitter.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    abusive.twitter.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    if (!overview.organic.platforms.TikTok) {
        return ( <Alert severity="info">{t("dashboard.twitter.nothing")}</Alert> )
    }

    var timelineMax = calcMaxY(overview.twitter.timeline);

    let overviewLayout = {
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
            range: [overview.from, dayjs(overview.to).add(1, "day").toISOString()],
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
        }
    }

    const abuseTimelineData = [];

    overview.twitter.timeline.forEach((all, i) => {

        var found = false;

        abusive.twitter.timeline.forEach((abuse, j) => {
            if (all.label === abuse.label) {
                abuseTimelineData.push(abuse);
                found = true;
            }
        })

        if (!found) {
            abuseTimelineData.push({
                label: all.label
            })
        }
    })

    var timelineMaxAbusive = calcMaxY(abusive.twitter.timeline);

    let abusiveLayout = {
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
        yaxis: { fixedrange: true, range: [0, timelineMaxAbusive] },
        margin: {
            t: 60,
            b: 30
        },
        xaxis: {
            range: [overview.from, dayjs(overview.to).add(1, "day").toISOString()],
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
        }
    }
*/
    const countries = new Intl.DisplayNames([i18n?.language || "en"], { type: 'region' });

    const en_countries = new Intl.DisplayNames(["en"], { type: 'region' });

    const allCountries = {
        name: "All Tweets",
        type: "pie",
        labels: Array.from(Object.keys(overview.tiktok.countries)).slice(0, 5).map(function (i) { return getCountryName(countries,i); }),
        values: Array.from(Object.values(overview.tiktok.countries)).slice(0, 5),
        codes: Array.from(Object.keys(overview.tiktok.countries)).slice(0, 5),
        sort: false,
        direction: "clockwise"
    };

    const allMap = [{
        type: 'choropleth',
        locationmode: 'country names',
        locations: Array.from(Object.keys(overview.tiktok.countries)).map(function (i) { return getCountryName(en_countries,i); }),
        z: Array.from(Object.values(overview.tiktok.countries)),
       //text: Array.from(Object.keys(overview.tiktok.countries)),
        autocolorscale: true
    }];

    var totalAllCountries = Array.from(Object.values(overview.tiktok.countries)).reduce((partialSum, a) => partialSum + a, 0);

    var restOfWorldAll = Array.from(Object.values(overview.tiktok.countries)).slice(5).reduce((partialSum, a) => partialSum + a, 0);

    if (restOfWorldAll > 0) {
        allCountries.labels.push(t("dashboard.maps.RoW"));
        allCountries.values.push(restOfWorldAll);
    }

    const abusiveCountries = {
        name: "Abusive Tweets",
        type: "pie",
        labels: Array.from(Object.keys(abusive.tiktok.countries)).slice(0, 5).map(function (i) { return getCountryName(countries,i); }),
        values: Array.from(Object.values(abusive.tiktok.countries)).slice(0, 5),
        codes: Array.from(Object.keys(abusive.tiktok.countries)).slice(0, 5),
        sort: false,
        direction: "clockwise"
    };

    var totalAbusiveCountries = Array.from(Object.values(abusive.tiktok.countries)).reduce((partialSum, a) => partialSum + a, 0);

    const abusiveMap = [{
        type: 'choropleth',
        locationmode: 'country names',
        locations: Array.from(Object.keys(abusive.tiktok.countries)).map(function (i) { return getCountryName(en_countries,i); }),
        z: Array.from(Object.values(abusive.tiktok.countries)),
       //text: Array.from(Object.keys(overview.tiktok.countries)),
        autocolorscale: true
    }];

    restOfWorldAll = Array.from(Object.values(abusive.tiktok.countries)).slice(5).reduce((partialSum, a) => partialSum + a, 0);

    if (restOfWorldAll > 0) {
        abusiveCountries.labels.push(t("dashboard.maps.RoW"));
        abusiveCountries.values.push(restOfWorldAll);
    }

    const allPosters = [];
    if (overview?.all?.posters?.TikTok) {
        Object.keys(overview.all.posters.TikTok).map((screen_name) => (
            allPosters.push({
                account: screen_name,
                posts: overview.all.posters.TikTok[screen_name].toLocaleString()
            })
        ));
    }

    const abusivePosters = [];
    if (abusive.all?.posters?.TikTok) {
        Object.keys(abusive.all.posters.TikTok).map((screen_name) => (
            abusivePosters.push({
                account: screen_name,
                posts: abusive.all.posters.TikTok[screen_name].toLocaleString()
            })
        ));
    }

    return (
        <React.Fragment>
            <Grid item xs={12} data-cy={"histogramHeader"}>
                <Typography variant={"body2"}>{t("dashboard.tiktok.description")}</Typography>
            </Grid>
            
            <Box mt={5} />
            {totalAllCountries !== 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewLanguages">

                <Grid item xs={12} data-cy="countriesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.tiktok.all.country_title")}
                        <SVGDownload id="countries-all" filename="tiktok-by-country.svg" />
                        <SVGDownload id="countries-all" type="PNG" filename="tiktok-by-country.png" />
                        <CSVDownload filename="tiktok-by-country" method={convertObjToCsv(overview.tiktok.countries, ["country", "count"])} />
                        <PDFReport title={t("dashboard.tiktok.all.country_title")} id="countries-all" addToReport={props.addToReport}/>
                    </Typography>
                    <Typography variant={"body2"}>{t("dashboard.tiktok.all.country_description")}</Typography>
                </Grid>

                <Grid item xs={6} data-cy="countriesPlot">
                    <Plot divId="countries-all" style={{ width: "100%" }} data={[allCountries]} layout={{ margin: { }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", xaxis: { fixedrange: true }, yaxis: { fixedrange: true } }} config={{ responsive: false, 'displayModeBar': false }} />
                </Grid>

                <Grid p={2} item xs={6} data-cy="langagesTable">
                    <TableContainer component={Paper}>
                        <Table data-cy="languageTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.country")}</TableCell>
                                    <TableCell>{t("dashboard.tiktok.videos")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allCountries.labels.map((country, key) => (
                                    <TableRow data-cy={"language-"+key} key={key}>
                                        <TableCell><Link
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); props.addToQuery(allCountries.codes[key],"country"); }}
                                            underline="hover">{getFlagEmoji(allCountries.codes[key])+" "+country}</Link></TableCell>
                                        <TableCell>{allCountries.values[key].toLocaleString()} ({(100 * allCountries.values[key] / overview.all.platforms.TikTok).toFixed(2)}%)</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                <Grid item xs={12} data-cy="countriesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.tiktok.all.country_title")}
                        <SVGDownload id="countries-all-map" filename="tiktok-by-countries-map.svg" />
                        <SVGDownload id="countries-all-map" type="PNG" filename="tiktok-by-country-map.png" />
                        <PDFReport title={t("dashboard.tiktok.abusive.country_title")} id="countries-all-map" addToReport={props.addToReport}/>
                    </Typography>
                    <Typography variant={"body2"}>{t("dashboard.tiktok.abusive.country_description_map")}</Typography>
                </Grid>

                <Grid item xs={12}>
                    <Plot divId="countries-all-map" style={{ width: "100%" }} data={allMap} layout={{font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, height:600}}config={{ responsive: true, 'displayModeBar': false }} />
                </Grid>
            </Grid>}
            <Box mt={5} />
            {totalAbusiveCountries !== 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewLanguages">

                <Grid item xs={12} data-cy="countriesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.tiktok.abusive.country_title")}
                        <SVGDownload id="countries-abusive" filename="abusive-tiktok-by-countries.svg" />
                        <SVGDownload id="countries-abusive" type="PNG" filename="abusive-tiktok-by-country.png" />
                        <CSVDownload filename="abusive-tiktok-by-country" method={convertObjToCsv(abusive.tiktok.countries, ["country", "count"])} />
                        <PDFReport title={t("dashboard.tiktok.abusive.country_title")} id="countries-abusive" addToReport={props.addToReport}/>
                    </Typography>
                    <Typography variant={"body2"}>{t("dashboard.tiktok.abusive.country_description")}</Typography>
                </Grid>

                <Grid item xs={6} data-cy="countriesPlot">
                    <Plot divId="countries-abusive" style={{ width: "100%" }} data={[abusiveCountries]} layout={{ margin: { }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", xaxis: { fixedrange: true }, yaxis: { fixedrange: true } }} config={{ responsive: false, 'displayModeBar': false }} />
                </Grid>

                <Grid p={2} item xs={6} data-cy="langagesTable">
                    <TableContainer component={Paper}>
                        <Table data-cy="languageTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.country")}</TableCell>
                                    <TableCell>{t("dashboard.tiktok.videos")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {abusiveCountries.labels.map((country, key) => (
                                    <TableRow data-cy={"language-"+key} key={key}>
                                        <TableCell><Link
                                            href="#"
                                            onClick={(e) => { e.preventDefault(); props.addToQuery(abusiveCountries.codes[key],"country"); }}
                                            underline="hover">{getFlagEmoji(abusiveCountries.codes[key])+" "+country}</Link></TableCell>
                                        <TableCell>{abusiveCountries.values[key].toLocaleString()} ({(100 * abusiveCountries.values[key] / abusive.all.platforms.TikTok).toFixed(2)}%)</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                <Grid item xs={12} data-cy="countriesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.tiktok.abusive.country_title")}
                        <SVGDownload id="countries-abusive-map" filename="abusive-videos-by-countries-map.svg" />
                        <SVGDownload id="countries-abusive-map" type="PNG" filename="abusive-videos-by-country-map.png" />
                        <PDFReport title={t("dashboard.tiktok.abusive.country_title")} id="countries-abusive-map" addToReport={props.addToReport}/>
                    </Typography>
                    <Typography variant={"body2"}>{t("dashboard.tiktok.abusive.country_description_map")}</Typography>
                </Grid>

                <Grid item xs={12}>
                    <Plot divId="countries-abusive-map" style={{ width: "100%" }} data={abusiveMap} layout={{font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'},autosize: true, height:600}}config={{ responsive: true, 'displayModeBar': false }} />
                </Grid>
            </Grid>}
            <Box mt={5} />
            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">
                    {overview?.all?.posters?.TikTok && <Grid p={2} item xs={6} data-cy="triggersAuthors">
                    <Typography variant={"h6"} paragraph>{t("dashboard.tiktok.all.posters")} <PDFReport addToReport={props.addToReport}
                        title={"Top 10 Active Twitter Accounts"}
                        type="table"
                        headings={[t("dashboard.alerts.screen_name"), t("dashboard.alerts.posts"), ]}
                        render={(user, col) => {
                            if (col === 0) return <PDFLink src={getAccountLink("Twitter", user.account)}>{user.account}</PDFLink>
                            if (col === 1) return user.posts
                        }}
                        rows={allPosters}/></Typography>
                    <TableContainer component={Paper}>
                        <Table stickyHeader data-cy="triggersAuthorTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.abuse_triggers.table.screen_name")}</TableCell>
                                    {/*<TableCell>{t("dashboard.abuse_triggers.table.user")}</TableCell>*/}
                                    <TableCell>{t("dashboard.tiktok.videos")}</TableCell>
                                    
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(overview.all.posters.TikTok).map((screen_name, key) => (
                                    <TableRow data-cy={"abusive-author-"+key} key={key}>
                                        <TableCell data-cy="screenName">{key+1}. <UserMenu tabs={props.tabs} platform="TikTok" screen_name={screen_name} addToQuery={props.addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser}/></TableCell>
                                        {/*<TableCell data-cy="screenName">{key+1}. <Link href="#" onClick={(e) => {e.preventDefault(); props.addToQuery(screen_name,"author")}}>{anonymize(screen_name, anonymousMode)}</Link></TableCell>
                                        <TableCell><Link href="#"onClick={(e) => handleOpenUser(e, screen_name)}><ViewIcon style={{verticalAlign:"middle"}}/></Link></TableCell>*/}
                                        <TableCell data-cy="replies">{overview.all.posters.TikTok[screen_name].toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>}

                {abusive.all?.posters?.TikTok && Object.keys(abusive.all.posters.TikTok).size > 0 && <Grid p={2} item xs={6} data-cy="triggersAuthors">
                    <Typography variant={"h6"} paragraph>{t("dashboard.tiktok.abusive.posters")} <PDFReport addToReport={props.addToReport}
                        title={"Top 10 Abusive Twitter Accounts"}
                        type="table"
                        headings={[t("dashboard.alerts.screen_name"), t("dashboard.alerts.posts"), ]}
                        render={(user, col) => {
                            if (col === 0) return <PDFLink src={getAccountLink("Twitter", user.account)}>{user.account}</PDFLink>
                            if (col === 1) return user.posts
                        }}
                        rows={abusivePosters}/></Typography>
                    <TableContainer component={Paper}>
                        <Table stickyHeader data-cy="triggersAuthorTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.abuse_triggers.table.screen_name")}</TableCell>
                                    {/*<TableCell>{t("dashboard.abuse_triggers.table.user")}</TableCell>*/}
                                    <TableCell>{t("dashboard.tiktok.videos")}</TableCell>
                                    
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(abusive.all.posters.TikTok).map((screen_name, key) => (
                                    <TableRow data-cy={"abusive-author-"+key} key={key}>
                                        <TableCell data-cy="abusiveScreenName">{key+1}. <UserMenu tabs={props.tabs} platform="TikTok" screen_name={screen_name} addToQuery={props.addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser}/></TableCell>
                                        {/*<TableCell data-cy="screenName">{key+1}. <Link href="#" onClick={(e) => {e.preventDefault(); props.addToQuery(screen_name,"author")}}>{anonymize(screen_name, anonymousMode)}</Link></TableCell>
                                        <TableCell><Link href="#"onClick={(e) => handleOpenUser(e, screen_name)}><ViewIcon style={{verticalAlign:"middle"}}/></Link></TableCell>*/}
                                        <TableCell data-cy="replies">{abusive.all.posters.TikTok[screen_name].toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>}
                </Grid>
            
            <Dialog
            open={openUser}
            onClose={handleCloseUser}
            maxWidth="md"
            data-cy="triggesOpenUser">
            <DialogContent>
                <User screen_name={screenName} anonymousMode={anonymousMode} addToQuery={props.addToQuery} />
            </DialogContent>
        </Dialog>
            <Dialog
                open={tweets !== null}
                onClose={handleCloseTweets}
                maxWidth="md"
            >
                <DialogContent>
                    <TweetTable {...tweets} addToReport={props.addToReport} addToQuery={props.addToQuery} tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} displayOptions={tweetDisplayOptions} />
                </DialogContent>
            </Dialog>
        </React.Fragment>
    );
}

export default TikTokDetails;