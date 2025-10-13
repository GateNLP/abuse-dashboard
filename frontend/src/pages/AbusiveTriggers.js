import React from "react";
import { useDispatch, useSelector } from "react-redux";
import useMyStyles from "../MaterialUiStyles/useMyStyles";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableSortLabel from '@mui/material/TableSortLabel';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Grid from "@mui/material/Grid";
import TablePagination from "@mui/material/TablePagination";

import Typography from "@mui/material/Typography";

import Alert from '@mui/material/Alert';

import Link from "@mui/material/Link";

import { Box } from "@mui/material";

import LinearProgress from "@mui/material/LinearProgress";


import ConversationAPI from "../api";

import Plotly from 'plotly.js-dist-min';
import createPlotlyComponent from 'react-plotly.js/factory';

import SVGDownload from '../components/buttons/SVGDownload'

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import User from "../Results/User"
import { getPostLink, getAccountLink } from "../api";

import CSVDownload, {convertTimeHistogramToCsv, convertTriggersToCSV} from "../components/buttons/CSVDownload";
import PDFReport from "../components/buttons/PDFReport"
import {setConversationInput} from "../redux/actions/conversationActions";
import Status from "../Status";

import UserMenu from "../components/buttons/UserMenu"

import { Link as PDFLink } from '@react-pdf/renderer';

import { withTranslation } from "react-i18next";

const Plot = createPlotlyComponent(Plotly);

const conversationApi = ConversationAPI()

//todo: change localhost hard coded endpoint to expected endpoint. possibly in an env file?
const AbusiveTriggers = (props) => {

    const { t } = props;

    const dispatch = useDispatch();
    const classes = useMyStyles();

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);

    const triggers = useSelector(state => state.abusive.triggers);
    const loading = useSelector(state => state.abusive.loading);
    const failed = useSelector(state => state.abusive.failed);

    const [order, setOrder] = React.useState('desc');
    const [orderBy, setOrderBy] = React.useState('unique');

    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(10);

    const submitID = (src) => {
        dispatch(setConversationInput(src));
        props.tabs("conversation");
    };

    const [openUser, setOpenUser] = React.useState(false);
    const [screenName, setScreenName] = React.useState(null);

    const handleOpenUser = (screen_name) => {
        setScreenName(screen_name);
        setOpenUser(true);
    };

    const handleCloseUser = () => {
        setOpenUser(false);
        setScreenName(null);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const visibleRows = React.useMemo(
        () => {

            function descendingComparator(a, b, orderBy) {

                // TODO handle the -1 case to push them to the end (i.e. max time)
        
                var aV = a[orderBy] === -1 ? Number.MAX_SAFE_INTEGER : a[orderBy];
                var bV = b[orderBy] === -1 ? Number.MAX_SAFE_INTEGER : b[orderBy];
        
                if (bV < aV) {
                  return -1;
                }
                if (bV > aV) {
                  return 1;
                }
                return 0;
            }
        
            function getComparator(order, orderBy) {
                return order === 'desc'
                    ? (a, b) => descendingComparator(a, b, orderBy)
                    : (a, b) => -descendingComparator(a, b, orderBy);
            }
            
            if (triggers?.tweets == null) return [];

            return triggers.tweets.sort(getComparator(order, orderBy)).slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
          )},
        [order, orderBy, page, rowsPerPage, triggers?.tweets],
      );

    if (loading) {
        return ( <LinearProgress/> )
    }
    else if (failed) {
        return  <Status message={t("dashboard.abuse_triggers.error")}/>
    }

    var rawTime = [];

    triggers.tweets.forEach(tweet => {
        if (tweet.timeToAbuse !== -1) {
            if (tweet.timeToAbuse < 60*60) rawTime.push(Math.floor((tweet.timeToAbuse / 60)));
        }

        tweet["percentage"] = 100*tweet.unique/tweet.total;

        tweet["ratio"] = tweet.unique/tweet.accounts;
    });

    const createSortHandler = (property) => (event) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
      };

      if (triggers.abusive_replies === 0) {
        return ( <Alert severity="info">{t("dashboard.abuse_triggers.none", {from: triggers.from, to: triggers.to})}</Alert>)
    }

    const overviewDescription = [
        t("dashboard.abuse_triggers.date_range", {from: triggers.from, to: triggers.to}),
        "<li>"+t("dashboard.abuse_triggers.total_replies", {replies: triggers.all_replies.toLocaleString()}),
        "<li>"+t("dashboard.abuse_triggers.abusive_replies", {replies: triggers.abusive_replies.toLocaleString(), percentage: (100*triggers.abusive_replies/triggers.all_replies).toFixed(2)}),
        t("dashboard.abuse_triggers.there_were"),
        "<li>"+t("dashboard.abuse_triggers.one_reply", {posts: triggers.originals.toLocaleString()}),
        "<li>"+t("dashboard.abuse_triggers.one_abusive", {posts: triggers.tweets.length.toLocaleString(), percentage: (100*triggers.tweets.length/triggers.originals).toFixed(2)})
    ];

    const abusivePosters = [];
    Object.keys(triggers.authors).map((screen_name) => (
        abusivePosters.push({
            account: screen_name,
            posts: triggers.authors[screen_name].abusive.toLocaleString(),
            inReplyTo: triggers.authors[screen_name].tweets.toLocaleString()
        })
    ));

    return (
        (<React.Fragment>
            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start">
                <Grid item xs={12} data-cy="triggersSummary">
                    <Typography variant={"h6"}>{t("dashboard.abuse_triggers.date_range", {from: triggers.from, to: triggers.to})} <PDFReport type="text" addToReport={props.addToReport} title="Overview of Abuse Triggers" lines={overviewDescription}/></Typography>
                </Grid>

                <Grid item xs={12} data-cy="triggersReplies">
                    <ul>
                        <li data-cy="totalReplies">{t("dashboard.abuse_triggers.total_replies", {replies: triggers.all_replies.toLocaleString()})}</li>
                        <li data-cy="abusiveReplies">{t("dashboard.abuse_triggers.abusive_replies", {replies: triggers.abusive_replies.toLocaleString(), percentage: (100*triggers.abusive_replies/triggers.all_replies).toFixed(2)})}</li>
                    </ul>

                    <Typography variant={"body1"}>{t("dashboard.abuse_triggers.there_were")}</Typography>
                    <ul>
                        <li data-cy="tweetsWithReply">{t("dashboard.abuse_triggers.one_reply", {posts: triggers.originals.toLocaleString()})}</li>
                        <li data-cy="tweetsWithAbuse">{t("dashboard.abuse_triggers.one_abusive", {posts: triggers.tweets.length.toLocaleString(), percentage: (100*triggers.tweets.length/triggers.originals).toFixed(2)})}</li>
                    </ul>
                </Grid>
            </Grid>
            <Box mt={5}/>
            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start">
                <Grid item xs={12}
                data-cy="triggersTable">

                <Typography variant={"body1"}>{t("dashboard.abuse_triggers.paragraph_1")}</Typography>
                <Box m={3} />
                <Typography variant={"body1"}>{t("dashboard.abuse_triggers.paragraph_2")}
                    <CSVDownload filename="abuse-triggers" method={convertTriggersToCSV(triggers.tweets)}/></Typography>
                <Box m={3} />

                <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <TableContainer>
                    <Table data-cy="triggerTable" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t("dashboard.abuse_triggers.table.tweet_url")}</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === "createdAt"}
                                        direction={orderBy === "createdAt" ? order : 'asc'}
                                        onClick={createSortHandler("createdAt")}>
                                        {t("dashboard.abuse_triggers.table.time")}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === "total"}
                                        direction={orderBy === "total" ? order : 'asc'}
                                        onClick={createSortHandler("total")}>
                                        {t("dashboard.abuse_triggers.table.all_replies")}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === "unique"}
                                        direction={orderBy === "unique" ? order : 'asc'}
                                        onClick={createSortHandler("unique")}>
                                        {t("dashboard.abuse_triggers.table.abusive_replies")}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === "percentage"}
                                        directin={orderBy === "percentage" ? order : 'asc'}
                                        onClick={createSortHandler("percentage")}>
                                        {t("dashboard.abuse_triggers.table.abuse_percentage")}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === "timeToAbuse"}
                                        direction={orderBy === "timeToAbuse" ? order : 'asc'}
                                        onClick={createSortHandler("timeToAbuse")}>
                                        {t("dashboard.abuse_triggers.table.first_abuse")}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === "accounts"}
                                        direction={orderBy === "accounts" ? order : 'asc'}
                                        onClick={createSortHandler("accounts")}>
                                        {t("dashboard.abuse_triggers.table.accounts")}
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === "ratio"}
                                        direction={orderBy === "ratio" ? order : 'asc'}
                                        onClick={createSortHandler("ratio")}>
                                        {t("dashboard.abuse_triggers.table.ratio")}
                                    </TableSortLabel>
                                </TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleRows.map((row, key) => (
                                <TableRow hover key={key} data-cy={"tweet-"+row.id_str}>
                                    {row.timeToAbuse === -1 ? <TableCell style={{whiteSpace:"nowrap"}}>{(page*rowsPerPage)+key+1}. {getPostLink({platform: row.platform, id: row.id_str, user: {screen_name: row.screen_name}})}</TableCell> : <TableCell style={{whiteSpace:"nowrap"}}>{(page*rowsPerPage)+key+1}. <Link
                                        href="#"
                                        onClick={() => submitID(getPostLink({platform: row.platform, id: row.id_str, user: {screen_name: row.screen_name}, conversation_id: row.conversation_id}))}
                                        underline="hover">{getPostLink({platform: row.platform, id: row.id_str, user: {screen_name: row.screen_name}, conversation_id: row.conversation_id})}</Link></TableCell>}
                                    <TableCell data-cy="time" style={{whiteSpace:"nowrap"}}>{row.createdAt !== "" && (new Date(row.createdAt)).toLocaleString()}</TableCell>
                                    <TableCell data-cy="total">{row.total.toLocaleString()}</TableCell>
                                    <TableCell data-cy="abusive">{row.unique.toLocaleString()}</TableCell>
                                    <TableCell data-cy="abusivePercent">{row.percentage.toFixed(2)}%</TableCell>
                                    <TableCell data-cy="timeToAbuse">{conversationApi.formatSeconds(row.timeToAbuse)}</TableCell>
                                    <TableCell>{row.accounts.toLocaleString()}</TableCell>
                                    <TableCell>{row.ratio.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={triggers.tweets.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
                </Paper>
                </Grid>
            </Grid>
            <Box mt={5}/>
            {rawTime.length > 0 && <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="triggersHistogram">

                <Grid item xs={12} data-cy="triggersHistHeader">
                    <Typography variant={"body1"}>{t("dashboard.abuse_triggers.paragraph_3")}
                        <SVGDownload id="first-abuse" filename="time-to-first-abusive-reply.svg"/>
                        <SVGDownload id="first-abuse" type="PNG" filename="time-to-first-abusive-reply.png"/>
                        <CSVDownload filename="time-to-first-abusive-reply" method={convertTimeHistogramToCsv(rawTime, 60, ["minute", "number of tweets that received an abusive reply"])}/>
                        <PDFReport title={t("dashboard.abuse_triggers.graph_title")} id="first-abuse" addToReport={props.addToReport}/>
                    </Typography>
                </Grid>

                <Grid item xs={12} data-cy="triggersHistPlot">
                    <Plot divId="first-abuse" style= {{width:"100%"}} data={[{x: rawTime, type: "histogram", nbinsx: 60}]} layout={{font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'},yaxis: {fixedrange: true}, xaxis: {title:{text:t("dashboard.abuse_triggers.graph_title")},fixedrange: true, dtick: 5, tickmode:"linear", range: [0, 59]}, bargap: 0.1 }} config = {{responsive: false, 'displayModeBar': false}} />
                </Grid>
            </Grid>}
            <Box mt={5}/>
            <Grid component={Paper}
                container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="triggersAA">

                {Object.keys(triggers.authors).length > 0 && <Grid p={2} item xs={6} data-cy="triggersAuthors">
                    <Typography variant={"body1"} paragraph>{t("dashboard.abuse_triggers.abuse_table")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.abuse_triggers.abuse_table")}
                        type="table"
                        headings={[t("dashboard.abuse_triggers.table.screen_name"), t("dashboard.abuse_triggers.table.abusive_replies"), t("dashboard.abuse_triggers.table.reply_to")]}
                        render={(user, col) => {
                            if (col === 0) return <PDFLink src={getAccountLink("Twitter", user.account)}>{user.account}</PDFLink>
                            if (col === 1) return triggers.authors[user.account].abusive.toLocaleString()
                            if (col === 2) return triggers.authors[user.account].tweets.toLocaleString()
                        }}
                        rows={abusivePosters}/></Typography>
                    <TableContainer component={Paper}>
                        <Table stickyHeader data-cy="triggersAuthorTable" className={classes.table}>
                            <TableHead>
                                <TableRow>
                                    <TableCell>{t("dashboard.abuse_triggers.table.screen_name")}</TableCell>
                                    <TableCell>{t("dashboard.abuse_triggers.table.abusive_replies")}</TableCell>
                                    <TableCell>{t("dashboard.abuse_triggers.table.reply_to")}</TableCell>
                                    <TableCell>% Abusive Replies</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {Object.keys(triggers.authors).map((screen_name, key) => (
                                    <TableRow data-cy={"abusive-author-"+key} key={key}>
                                        <TableCell data-cy="screenName">{key+1}. <UserMenu tabs={props.tabs} platform={triggers.authors[screen_name].platform} screen_name={screen_name} addToQuery={props.addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser}/></TableCell>
                                        <TableCell data-cy="replies">{triggers.authors[screen_name].abusive.toLocaleString()}</TableCell>
                                        <TableCell data-cy="inReplyTo">{triggers.authors[screen_name].tweets.toLocaleString()}</TableCell>
                                        <TableCell>{(100*triggers.authors[screen_name].abusive/triggers.abusive_replies).toFixed(2)}</TableCell>
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
        </React.Fragment>)
    );
}

export default withTranslation()(AbusiveTriggers);