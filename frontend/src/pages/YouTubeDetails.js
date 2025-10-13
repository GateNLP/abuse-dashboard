import React from "react";
import { useSelector } from "react-redux";

import { useTranslation } from "react-i18next";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import useMyStyles from "../MaterialUiStyles/useMyStyles";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import User from "../Results/User";

import PDFReport from "../components/buttons/PDFReport";

import Grid from "@mui/material/Grid";
import Paper from '@mui/material/Paper';

import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory';

import Typography from "@mui/material/Typography";

import { Box, Button } from "@mui/material";

import Alert from '@mui/material/Alert';

import { calcMaxY, getAccountLink } from "../api";

import LinearProgress from "@mui/material/LinearProgress";

import SVGDownload from '../components/buttons/SVGDownload'
import CSVDownload, {
    convertDistToCsv,
} from "../components/buttons/CSVDownload";

import { Link as PDFLink } from '@react-pdf/renderer';

import UserMenu from "../components/buttons/UserMenu"

import dayjs from "dayjs";

const Plot = createPlotlyComponent(Plotly);

const YouTubeDetails = (props) => {

    const { t } = useTranslation();

    const overview = useSelector(state => state.dashboard.overview);
    const abusive = useSelector(state => state.abusive.abusive);
    const loading = useSelector(state => state.abusive.loading);

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);

    const classes = useMyStyles();

    var allAxisStart = ""
    var abuseAxisStart = ""
    var allAxisEnd = ""
    var abuseAxisEnd = ""

    const [openUser, setOpenUser] = React.useState(false);
    const [screenName, setScreenName] = React.useState(null);

    const handleOpenUser = (screen_name) => {
        //e.preventDefault();
        setScreenName(screen_name);
        setOpenUser(true);
    };

    const handleCloseUser = () => {
        setOpenUser(false);
        setScreenName(null);
    };


    if (loading) {
        return ( <LinearProgress/> )
    }

    overview.youtube.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    abusive.youtube.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    if (!overview.all.platforms.YouTube) {
        return ( <Alert severity="info">{t("dashboard.youtube.nothing")}</Alert> )
    }

    var timelineMax = calcMaxY(overview.youtube.timeline);

    

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

    overview.youtube.timeline.forEach((all, i) => {

        var found = false;

        abusive.youtube.timeline.forEach((abuse, j) => {
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

    var timelineMaxAbusive = calcMaxY(abusive.youtube.timeline);

    

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

    const allPosters = [];
    if (overview?.all?.posters?.YouTube) {
        Object.keys(overview.all.posters.YouTube).map((screen_name) => (
            allPosters.push({
                account: screen_name,
                posts: overview.all.posters.YouTube[screen_name].toLocaleString()
            })
        ));
    }

    const abusivePosters = [];
    if (abusive?.all?.posters?.YouTube) {
        Object.keys(abusive.all.posters.YouTube).map((screen_name) => (
            abusivePosters.push({
                account: screen_name,
                posts: abusive.all.posters.YouTube[screen_name].toLocaleString()
            })
        ));
    }

    return (
        <React.Fragment>

            <Grid item xs={12} data-cy={"histogramHeader"}>
                <Typography variant={"body2"}>{t("dashboard.youtube.description")}</Typography>
            </Grid>
            
            <Box mt={5} />

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">

                <Grid item xs={12} data-cy={"histogramHeader"}>
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.youtube.all.query_title")}
                        <SVGDownload id="all-youtube-comments-relevant-to" filename="all-youtube-comments-relevant-to.svg" />
                        <SVGDownload id="all-youtube-comments-relevant-to" type="PNG" filename="all-youtube-comments-relevant-to.png" />
                        <CSVDownload filename="all-youtube-comments-relevant-to" method={convertDistToCsv(overview.youtube.timeline, ["query", "date", "count"])} /> <Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(allAxisStart, allAxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button>
                        <PDFReport title={t("dashboard.youtube.all.query_title")} id="all-youtube-comments-relevant-to" addToReport={props.addToReport}/>
                    </Typography>

                    <Plot divId="all-youtube-comments-relevant-to" style={{ width: "100%", height: 450 }} data={overview.youtube.timeline} layout={overviewLayout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }} onRelayout={(event) => { allAxisStart = event["xaxis.range[0]"]; allAxisEnd = event["xaxis.range[1]"] }}  />
                </Grid>
            </Grid>

            <Box mt={5} />

            {timelineMaxAbusive > 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">

                <Grid item xs={12} data-cy={"histogramHeader"}>
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.youtube.abusive.query_title")}
                        <SVGDownload id="abusive-youtube-comments-relevant-to" filename="abusive-youtube-comments-relevant-to.svg" />
                        <SVGDownload id="abusive-youtube-comments-relevant-to" type="PNG" filename="abusive-youtube-comments-relevant-to.png" />
                        <CSVDownload filename="abusive-youtube-comments-relevant-to" method={convertDistToCsv(abusive.youtube.timeline, ["query", "date", "count"])} /> <Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(abuseAxisStart, abuseAxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button>
                        <PDFReport title={t("dashboard.youtube.abusive.query_title")} id="abusive-youtube-comments-relevant-to" addToReport={props.addToReport}/>
                    </Typography>

                    <Plot divId="abusive-youtube-comments-relevant-to" style={{ width: "100%", height: 450 }} data={abuseTimelineData} layout={abusiveLayout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }} onRelayout={(event) => { abuseAxisStart = event["xaxis.range[0]"]; abuseAxisEnd = event["xaxis.range[1]"] }} />
                </Grid>
            </Grid>}

            <Box mt={5} />

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">
            <Grid p={2} item xs={6} data-cy="triggersAuthors">
                    <Typography variant={"h6"} paragraph>{t("dashboard.youtube.all.posters")} <PDFReport addToReport={props.addToReport}
                        title={"Top 10 Active YouTube Accounts"}
                        type="table"
                        headings={[t("dashboard.alerts.screen_name"), t("dashboard.alerts.posts"), ]}
                        render={(user, col) => {
                            if (col === 0) return <PDFLink src={getAccountLink("YouTube", user.account)}>{user.account}</PDFLink>
                            if (col === 1) return user.posts
                        }}
                        rows={allPosters}/></Typography>
                    <TableContainer component={Paper}>
                        <Table stickyHeader data-cy="triggersAuthorTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.abuse_triggers.table.screen_name")}</TableCell>
                                    {/*<TableCell>{t("dashboard.abuse_triggers.table.user")}</TableCell>*/}
                                    <TableCell>{t("dashboard.youtube.posts")}</TableCell>
                                    
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(overview.all.posters.YouTube).map((screen_name, key) => (
                                    <TableRow data-cy={"abusive-author-"+key} key={key}>
                                        <TableCell data-cy="screenName">{key+1}. <UserMenu tabs={props.tabs} platform="YouTube" screen_name={screen_name} addToQuery={props.addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser}/></TableCell>
                                        {/*<TableCell><Link href="#"onClick={(e) => handleOpenUser(e, screen_name)}><ViewIcon style={{verticalAlign:"middle"}}/></Link></TableCell>*/}
                                        <TableCell data-cy="replies">{overview.all.posters.YouTube[screen_name].toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Grid>

                {abusive.all?.posters?.YouTube && <Grid p={2} item xs={6} data-cy="triggersAuthors">
                    <Typography variant={"h6"} paragraph>{t("dashboard.youtube.abusive.posters")} <PDFReport addToReport={props.addToReport}
                        title={"Top 10 Abusive YouTube Accounts"}
                        type="table"
                        headings={[t("dashboard.alerts.screen_name"), t("dashboard.alerts.posts"), ]}
                        render={(user, col) => {
                            if (col === 0) return <PDFLink src={getAccountLink("YouTube", user.account)}>{user.account}</PDFLink>
                            if (col === 1) return user.posts
                        }}
                        rows={abusivePosters}/></Typography>
                    <TableContainer component={Paper}>
                        <Table stickyHeader data-cy="triggersAuthorTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.abuse_triggers.table.screen_name")}</TableCell>
                                    {/*<TableCell>{t("dashboard.abuse_triggers.table.user")}</TableCell>*/}
                                    <TableCell>{t("dashboard.youtube.posts")}</TableCell>
                                    
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(abusive.all.posters.YouTube).map((screen_name, key) => (
                                    <TableRow data-cy={"abusive-author-"+key} key={key}>
                                        <TableCell data-cy="screenName">{key+1}. <UserMenu tabs={props.tabs} platform="YouTube" screen_name={screen_name} addToQuery={props.addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser}/></TableCell>
                                        {/*<TableCell><Link href="#"onClick={(e) => handleOpenUser(e, screen_name)}><ViewIcon style={{verticalAlign:"middle"}}/></Link></TableCell>*/}
                                        <TableCell data-cy="replies">{abusive.all.posters.YouTube[screen_name].toLocaleString()}</TableCell>
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


        </React.Fragment>
    )
}

export default YouTubeDetails;