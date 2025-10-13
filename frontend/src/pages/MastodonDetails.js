import React from "react";
import { useSelector } from "react-redux";

import { useTranslation } from "react-i18next";

import Link from "@mui/material/Link";
import Grid from "@mui/material/Grid";
import Paper from '@mui/material/Paper';

import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory';

import Typography from "@mui/material/Typography";

import { Box } from "@mui/material";

import Alert from '@mui/material/Alert';

import LinearProgress from "@mui/material/LinearProgress";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import useMyStyles from "../MaterialUiStyles/useMyStyles";

import SVGDownload from '../components/buttons/SVGDownload'
import CSVDownload, {
    convertDistToCsv,
    convertObjToCsv,
} from "../components/buttons/CSVDownload";

import { calcMaxY } from "../api";

import dayjs from "dayjs";

const Plot = createPlotlyComponent(Plotly);

const MastodonDetails = (props) => {

    const { t } = useTranslation();

    const classes = useMyStyles();

    const overview = useSelector(state => state.dashboard.overview);
    const abusive = useSelector(state => state.abusive.abusive);
    const loading = useSelector(state => state.abusive.loading);

    if (loading) {
        return ( <LinearProgress/> )
    }

    overview.mastodon.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    abusive.mastodon.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    if (!overview.all.platforms.Mastodon) {
        return ( <Alert severity="info">{t("dashboard.mastodon.nothing")}</Alert> )
    }

    var timelineMax = calcMaxY(overview.mastodon.timeline);

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

    overview.mastodon.timeline.forEach((all, i) => {

        var found = false;

        abusive.mastodon.timeline.forEach((abuse, j) => {
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

    timelineMax = calcMaxY(abusive.mastodon.timeline);

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

    const allServers = {
        name: "All Servers",
        type: "pie",
        labels: Array.from(Object.keys(overview.all.mastodon_servers)).slice(0, 5),
        values: Array.from(Object.values(overview.all.mastodon_servers)).slice(0, 5),
        codes: Array.from(Object.keys(overview.all.mastodon_servers)).slice(0, 5),
        sort: false,
        direction: "clockwise"
    };

    var restServersAll = Array.from(Object.values(overview.all.mastodon_servers)).slice(5).reduce((partialSum, a) => partialSum + a, 0);

    if (restServersAll > 0) {
        allServers.labels.push("Other");
        allServers.values.push(restServersAll);
    }

    const abusiveServers = {
        name: "Abusive Servers",
        type: "pie",
        labels: Array.from(Object.keys(abusive.all.mastodon_servers)).slice(0, 5),
        values: Array.from(Object.values(abusive.all.mastodon_servers)).slice(0, 5),
        codes: Array.from(Object.keys(abusive.all.mastodon_servers)).slice(0, 5),
        sort: false,
        direction: "clockwise"
    };

    var restServersAbusive = Array.from(Object.values(abusive.all.mastodon_servers)).slice(5).reduce((partialSum, a) => partialSum + a, 0);

    if (restServersAbusive > 0) {
        abusiveServers.labels.push("Other");
        abusiveServers.values.push(restServersAbusive);
    }

    return (
        <React.Fragment>
            <Grid item xs={12} data-cy={"histogramHeader"}>
                <Typography variant={"body2"}>{t("dashboard.mastodon.description")}</Typography>
            </Grid>
            <Box mt={5} />
            {overview?.users?.length > 1 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">

                <Grid item xs={12} data-cy={"histogramHeader"}>
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.mastodon.all.account_title")}
                        <SVGDownload id="all-tweets-by-account" filename="all-tweets-by-account.svg" />
                        <SVGDownload id="all-tweets-by-account" type="PNG" filename="all-tweets-by-account.png" /> 
                        <CSVDownload filename="all-tweets-by-account" method={convertDistToCsv(overview.mastodon.timeline, ["account", "date", "count"])} />{/*<Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(xaxisStart, xaxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button>*/}
                    </Typography>

                    <Plot divId="all-tweets-by-account" style={{ width: "100%", height: 450 }} data={overview.mastodon.timeline} layout={overviewLayout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }}  />
                </Grid>
            </Grid>}
            <Box mt={5} />
            {overview?.users?.length > 1 && abusive.all.count !== 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">

                <Grid item xs={12} data-cy={"histogramHeader"}>
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.mastodon.abusive.account_title")}
                        <SVGDownload id="abusive-tweets-by-account" filename="tweets-over-time.svg" />
                        <SVGDownload id="abusive-tweets-by-account" type="PNG" filename="tweets-over-time.png" />
                        <CSVDownload filename="abusive-tweets-by-account" method={convertDistToCsv(abusive.mastodon.timeline, ["account", "date", "count"])} />{/*<Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(xaxisStart, xaxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button>*/}
                    </Typography>

                    <Plot divId="abusive-tweets-by-account" style={{ width: "100%", height: 450 }} data={abuseTimelineData} layout={abusiveLayout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }}  />
                </Grid>
            </Grid>}
            <Box mt={5} />
            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewLanguages">

                <Grid item xs={12} data-cy="countriesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.mastodon.all.server_title")}
                        <SVGDownload id="all-mastodon-servers" filename="all-mastodon-servers.svg" />
                        <SVGDownload id="all-mastodon-servers" type="PNG" filename="all-mastodon-servers.png" />
                        <CSVDownload filename="all-mastodon-servers" method={convertObjToCsv(overview.all.mastodon_servers, ["server", "count"])} />
                    </Typography>
                </Grid>

                <Grid item xs={6} data-cy="countriesPlot">
                    <Plot divId="all-mastodon-servers" style={{ width: "100%" }} data={[allServers]} layout={{ margin: { }, font:{size:14},autosize: true, barmode: "group", xaxis: { fixedrange: true }, yaxis: { fixedrange: true } }} config={{ responsive: false, 'displayModeBar': false }} />
                </Grid>

                <Grid p={2} item xs={6} data-cy="langagesTable">
                    <TableContainer component={Paper}>
                        <Table data-cy="languageTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.mastodon.server")}</TableCell>
                                    <TableCell>{t("dashboard.mastodon.posts")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {allServers.labels.map((country, key) => (
                                    <TableRow data-cy={"language-"+key} key={key}>
                                        <TableCell>{country === "Other" ? country : <Link href={"https://"+country} target="_blank" underline="hover">{country}</Link>}</TableCell>
                                        <TableCell>{allServers.values[key].toLocaleString()} ({(100 * allServers.values[key] / overview.all.platforms.Mastodon).toFixed(2)}%)</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>
            <Box mt={5} />
            {abusive.all.count !== 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewLanguages">

                <Grid item xs={12} data-cy="countriesHeader">
                    <Typography variant={"h6"} style={{ paddingBottom: 3 }}>{t("dashboard.mastodon.all.server_title")}
                        <SVGDownload id="abusive-mastodon-servers" filename="abusive-mastodon-servers.svg" />
                        <SVGDownload id="abusive-mastodon-servers" type="PNG" filename="abusive-mastodon-servers.png" />
                        <CSVDownload filename="abusive-mastodon-servers" method={convertObjToCsv(abusive.all.mastodon_servers, ["server", "count"])} />
                    </Typography>
                </Grid>

                <Grid item xs={6} data-cy="countriesPlot">
                    <Plot divId="abusive-mastodon-servers" style={{ width: "100%" }} data={[abusiveServers]} layout={{ margin: { }, font:{size:14},autosize: true, barmode: "group", xaxis: { fixedrange: true }, yaxis: { fixedrange: true } }} config={{ responsive: false, 'displayModeBar': false }} />
                </Grid>

                <Grid p={2} item xs={6} data-cy="langagesTable">
                    <TableContainer component={Paper}>
                        <Table data-cy="languageTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.mastodon.server")}</TableCell>
                                    <TableCell>{t("dashboard.mastodon.posts")}</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {abusiveServers.labels.map((country, key) => (
                                    <TableRow data-cy={"language-"+key} key={key}>
                                        <TableCell>{country === "Other" ? country : <Link href={"https://"+country} target="_blank" underline="hover">{country}</Link>}</TableCell>
                                        <TableCell>{abusiveServers.values[key].toLocaleString()} ({(100 * abusiveServers.values[key] / abusive.all.platforms.Mastodon).toFixed(2)}%)</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>
            </Grid>}
        </React.Fragment>
    );
}

export default MastodonDetails;