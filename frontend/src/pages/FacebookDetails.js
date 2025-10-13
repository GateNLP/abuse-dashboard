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

const FacebookDetails = (props) => {

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

    overview.facebook.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    abusive.facebook.timeline.forEach(entry => {
        entry.name = entry.label;
        entry.hovertemplate = "%{x|%e %b %Y}: %{y}";
        // set the bar offset to one and a half hours in milliseconds.  When combined
        // with the plot-level bargap of three hours, this has the effect of positioning
        // the bar in the middle of its slot, with one sixteenth of the space as the left
        // hand gap, seven eighths of the space as the bar itself, and one sixteenth
        // as the right hand gap
        entry.offset = 90 * 60 * 1000;
    });

    if (!overview.all.platforms.Facebook) {
        return ( <Alert severity="info">{t("dashboard.facebook.nothing")}</Alert> )
    }

    var timelineMax = calcMaxY(overview.facebook.timeline);

    

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

    overview.facebook.timeline.forEach((all, i) => {

        var found = false;

        abusive.facebook.timeline.forEach((abuse, j) => {
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

    var timelineMaxAbusive = calcMaxY(abusive.facebook.timeline);

    

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

    return (
        <React.Fragment>
            
            <Box mt={5} />

            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="overviewHistogram">

                <Grid item xs={12} data-cy={"histogramHeader"}>
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.facebook.all.query_title")}
                        <SVGDownload id="all-facebook-comments-relevant-to" filename="all-facebook-comments-relevant-to.svg" />
                        <SVGDownload id="all-facebook-comments-relevant-to" type="PNG" filename="all-facebook-comments-relevant-to.png" />
                        <CSVDownload filename="all-facebook-comments-relevant-to" method={convertDistToCsv(overview.facebook.timeline, ["query", "date", "count"])} /> <Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(allAxisStart, allAxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button>
                        <PDFReport title={t("dashboard.facebook.all.query_title")} id="all-facebook-comments-relevant-to" addToReport={props.addToReport}/>
                    </Typography>

                    <Plot divId="all-facebook-comments-relevant-to" style={{ width: "100%", height: 450 }} data={overview.facebook.timeline} layout={overviewLayout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }} onRelayout={(event) => { allAxisStart = event["xaxis.range[0]"]; allAxisEnd = event["xaxis.range[1]"] }}  />
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
                    <Typography variant={"h6"} style={{ paddingBottom: 8 }}>{t("dashboard.facebook.abusive.query_title")}
                        <SVGDownload id="abusive-facebook-comments-relevant-to" filename="abusive-facebook-comments-relevant-to.svg" />
                        <SVGDownload id="abusive-facebook-comments-relevant-to" type="PNG" filename="abusive-facebook-comments-relevant-to.png" />
                        <CSVDownload filename="abusive-facebook-comments-relevant-to" method={convertDistToCsv(abusive.facebook.timeline, ["query", "date", "count"])} /> <Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => { props.setDateRange(abuseAxisStart, abuseAxisEnd); }}>{t("dashboard.overview.distribution_update")}</Button>
                        <PDFReport title={t("dashboard.facebook.abusive.query_title")} id="abusive-facebook-comments-relevant-to" addToReport={props.addToReport}/>
                    </Typography>

                    <Plot divId="abusive-facebook-comments-relevant-to" style={{ width: "100%", height: 450 }} data={abuseTimelineData} layout={abusiveLayout} config={{ responsive: true, 'displayModeBar': true, displaylogo: false }} onRelayout={(event) => { abuseAxisStart = event["xaxis.range[0]"]; abuseAxisEnd = event["xaxis.range[1]"] }} />
                </Grid>
            </Grid>}

            


        </React.Fragment>
    )
}

export default FacebookDetails;