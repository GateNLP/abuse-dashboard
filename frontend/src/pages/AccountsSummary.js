import React from "react";
import { useSelector } from "react-redux";
import SquareIcon from '@mui/icons-material/Square';

import Status from "../Status";
import LinearProgress from "@mui/material/LinearProgress";

import Paper from '@mui/material/Paper';

import { withTranslation } from "react-i18next";

import UserMenu from "../components/buttons/UserMenu";
import User from "../Results/User";

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';

import Grid from "@mui/material/Grid";

import { Box, Divider } from "@mui/material";

import Typography from "@mui/material/Typography";

import Alert from '@mui/material/Alert';

import { getPlatformIcon, getPlotHeight } from "../api";

import PDFReport from "../components/buttons/PDFReport";

import Plotly from 'plotly.js-dist-min'
import createPlotlyComponent from 'react-plotly.js/factory';

const Plot = createPlotlyComponent(Plotly);

const AccountsSummary = (props) => {

    //eslint-disable-next-line
    const { t, i18n } = props;

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);

    const location = useSelector(state => state.dashboard.location)

    const summary = useSelector(state => state.summary.summary);
    const loading = useSelector(state => state.summary.loading);
    const failed = useSelector(state => state.summary.failed);
    const done = useSelector(state => state.summary.done);

    const timeline = useSelector(state => state.abusive.abusive.timeline);

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

    const userList = [];

    if (loading) {
        return (
            <React.Fragment>
                <Typography variant={"body1"} paragraph>{t("dashboard.summary.loading")}</Typography>
                <LinearProgress />
            </React.Fragment>
        )
    }

    else if (done && failed) {
        return <Status message={t("dashboard.summary.error")} />
    }

    const selectedPosts = {
        hovertemplate: "%{customdata}: %{x:.2%}",
        name: "",
        marker: {
            // TODO set this to an array where each is the platform color for the handle
            color: "#3a7b8d",
        },
        type: "bar",
        orientation: 'h',
        y: null,//Array.from(Object.keys(overview.all.topics)).slice(0,20).reverse().map(function (i) { return t("dashboard.overview.topics."+i) }),
        x: null//Array.from(Object.values(overview.all.topics)).slice(0,20).reverse()
    };

    const replyPosts = {
        hovertemplate: "%{customdata}: %{x:.2%}",
        name: "",
        marker: {
            // TODO set this to an array where each is the platform color for the handle
            color: "#3a7b8d",
        },
        type: "bar",
        orientation: 'h',
        y: null,//Array.from(Object.keys(overview.all.topics)).slice(0,20).reverse().map(function (i) { return t("dashboard.overview.topics."+i) }),
        x: null//Array.from(Object.values(overview.all.topics)).slice(0,20).reverse()
    };

    const locationUsers = [];

    if (location?.users?.length > 0 && summary !== null) {

        location.users.forEach((u, i) => {
            locationUsers.push(u);
            userList.push(u.handle+"|"+u.platform);
          
            if (u.key === undefined) {
                u.key = i;
                u.sort = 0;
                u.replies = 0;

                summary[i].overview.focus.total = summary[i].overview.focus.original + summary[i].overview.focus.reply;

                if (summary[i].abusive.all.count > 0) {
                    u.sort = 100 * summary[i].abusive.all.count / (summary[i].overview.all.count - summary[i].overview.focus.total)
                    u.replies = (100 * summary[i].abusive.all.to_monitored / summary[i].overview.all.to_monitored)
                } else {
                    u.sort = 0;
                    u.replies = 0;
                }
            }
        })

        selectedPosts.x = locationUsers.sort((a, b) => a.sort - b.sort).map(function(u) { return (u.sort/100)});
        selectedPosts.y = locationUsers.sort((a, b) => a.sort - b.sort).map(function(u, i) { return (locationUsers.length-i)+": "+u.name});
        selectedPosts.marker.color = locationUsers.sort((a, b) => a.sort - b.sort).map(function(u) { return location.colors[u.platform]});
        selectedPosts.customdata = locationUsers.sort((a, b) => a.sort - b.sort).map(function(u) { return u.name +" ("+u.handle+")"});

        replyPosts.x = locationUsers.sort((a, b) => a.replies - b.replies).map(function(u) { return (u.replies/100)});
        replyPosts.y = locationUsers.sort((a, b) => a.replies - b.replies).map(function(u, i) { return (locationUsers.length-i)+":" +u.name});
        replyPosts.marker.color = locationUsers.sort((a, b) => a.replies - b.replies).map(function(u) { return location.colors[u.platform]});
        replyPosts.customdata = locationUsers.sort((a, b) => a.replies - b.replies).map(function(u) { return u.name +" ("+u.handle+")"});
      }

    return (
        
        <Box mt={3}>

        <Typography variant={"body1"} paragraph>{t("dashboard.summary.description")}</Typography>

        <Grid container direction="row">
            <Grid item xs={4}>
                <Typography variant={"body1"}>{t("dashboard.summary.graphs.overview")}</Typography>
            </Grid>
            <Grid item xs={4}>
                <Plot style={{ width: "100%" }} data={[selectedPosts]} layout={{ margin: { t: 10, b: 40, l: 200, r: 20 }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", height: getPlotHeight(selectedPosts), hovertemplate: "%{y}: %{x:.2%}", xaxis: { tickformat: ".0%", fixedrange: true, title: t("dashboard.summary.graphs.selected") }, yaxis: { fixedrange: true } }} config={{ responsive: true, 'displayModeBar': false }} />
            </Grid>
            <Grid item xs={4}>
                <Plot style={{ width: "100%" }} data={[replyPosts]} layout={{ margin: { t: 10, b: 40, l: 200, r: 20 }, font:{size:14, family: '"Roboto", "Helvetica", "Arial", sans-serif'}, autosize: true, barmode: "group", height: getPlotHeight(replyPosts), xaxis: {tickformat: ".0%", fixedrange: true, title: t("dashboard.summary.graphs.replies") }, yaxis: { fixedrange: true } }} config={{ responsive: true, 'displayModeBar': false }} />
            </Grid>

            <Grid item xs={12}>
                {timeline.map((p) => {
                    return (
                        <span style={{float:"right", paddingLeft:"2em", paddingTop:"1em"}}><SquareIcon style={{verticalAlign:"bottom", color:p.marker.color}}/> {p.label}</span>
                    )
                })}
            </Grid>
        </Grid>
        {locationUsers.sort((a, b) => b.sort - a.sort).map((user, i) => {

            const key = user.key;

            const overview = summary[key].overview;
            
            const abusive = summary[key].abusive;

            const overviewDescription = [];

            overviewDescription.push(
                t("dashboard.summary.stats_all.unique", {posts: overview.all.count.toLocaleString(), authors:overview.all.tweet_authors.toLocaleString()}) +
                " " + t("dashboard.summary.reports.overview", {originals: overview.tweet_kind.original.toLocaleString(), replies: overview.tweet_kind.reply.toLocaleString()})
            )

            overviewDescription.push(
                t("dashboard.summary.reports.total", {user: user.name, total: overview.focus.total.toLocaleString(), original: overview.focus.original.toLocaleString(), replies: overview.focus.reply.toLocaleString()}) 
            )

            overviewDescription.push(
                // store the key and values into the report and expand the string at rendering time?
                t("dashboard.summary.reports.other", {user: user.name, total: (overview.all.count - overview.focus.total).toLocaleString(), original: (overview.tweet_kind.original - overview.focus.original).toLocaleString(), replies: (overview.tweet_kind.reply - overview.focus.reply).toLocaleString(), sentTo: overview.all.to_monitored.toLocaleString() })
            )

            // This is the start of the abusive bit

            if (abusive.all.count > 0) {
                overviewDescription.push(
                    t("dashboard.summary.stats_abusive.description", {user: user.name}) + " " +t("dashboard.summary.stats_abusive.unique", {posts: abusive.all.count.toLocaleString(), authors: abusive.all.tweet_authors.toLocaleString()}) +
                    " " + t("dashboard.summary.reports.abuseOverview", {user: user.name, originals: abusive.tweet_kind.original.toLocaleString(), replies: abusive.all.to_monitored.toLocaleString(), other: (abusive.tweet_kind.reply - abusive.all.to_monitored).toLocaleString()})
                )
            
                overviewDescription.push(
                    t("dashboard.summary.reports.abusePosts", {user: user.name, percentage: (100 * abusive.all.count / (overview.all.count - overview.focus.total)).toFixed(2)})
                )
            
                overviewDescription.push(
                    t("dashboard.summary.reports.abuseReplies", {user: user.name, percentage: (100 * abusive.all.to_monitored / overview.all.to_monitored).toFixed(2)})
                )
            } else {
                overviewDescription.push(
                    t("dashboard.summary.stats_abusive.none", {user: user.name, platform: user.platform})
                )
            }

            return (
                <React.Fragment key={key}>

                    <Box mt={5}/>

                    <Grid component={Paper}
                        container
                        direction="row"
                        p={2}
                        data-cy="overviewSummary"
                        alignItems="flex-start">

                        <Grid item xs={12} data-cy="overviewHeader">
                            <Typography variant={"h6"}><UserMenu tabs={props.tabs} users={userList} viewUser={handleOpenUser} addToQuery={props.addToQuery} platform ={user.platform} screen_name={user.handle} >{getPlatformIcon(user.platform, {height:"1em", verticalAlign:"middle"})} {user.name} {user.handle && <span>({user.handle})</span>}</UserMenu>{overview.all.count > 0 && <span style={{float:"right"}}><PDFReport type="text" addToReport={props.addToReport} title={"Overview of " +user.platform + " Posts Relevant To " +user.name +(user.handle && " ("+user.handle+")")} lines={overviewDescription}/></span>}</Typography>
                        </Grid>

                        {overview.all.count === 0 && <Grid item xs={12}><Alert severity="info">{t("dashboard.summary.stats_all.none", {platform: user.platform, user: user.name})}</Alert></Grid>}

                        {overview.all.count > 0 && <React.Fragment>

                            <Grid item xs={12}>
                                <Typography variant={"body1"}>{t("dashboard.summary.stats_all.description", {user: user.name, platform: user.platform})}</Typography>
                            </Grid>

                            <Grid p={2} item xs={4} data-cy="overviewTotalTweets">
                                
                                {t("dashboard.summary.stats_all.unique", { posts: overview.all.count.toLocaleString(), authors: overview.all.tweet_authors.toLocaleString() })}

                                <ul>
                                    <li>{t("dashboard.summary.stats_all.originals")}: {overview.tweet_kind.original.toLocaleString()}</li>
                                    <li>{t("dashboard.summary.stats_all.replies")}: {overview.tweet_kind.reply.toLocaleString()}</li>
                                </ul>
                            </Grid>

                            <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "0px" }} />

                            <Grid p={2} item xs={4} data-cy="overviewByUser">
                                {t("dashboard.summary.stats_all.total_by", { posts: overview.focus.total.toLocaleString(), user: user.name })}
                                <ul>
                                    <li>{t("dashboard.summary.stats_all.originals_by")}: {overview.focus.original.toLocaleString()}</li>
                                    <li>{t("dashboard.summary.stats_all.replies_by")}: {overview.focus.reply.toLocaleString()}</li>
                                </ul>
                            </Grid>

                            <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "0px" }} />

                            <Grid p={2} item xs={4} data-cy="overviewByOthers">
                                {t("dashboard.summary.stats_all.total_others", { posts: (overview.all.count - overview.focus.total).toLocaleString() })}
                                <ul>
                                    <li>{t("dashboard.summary.stats_all.original_others")}: {(overview.tweet_kind.original - overview.focus.original).toLocaleString()}</li>
                                    <li>{t("dashboard.summary.stats_all.replies_others")}: {(overview.tweet_kind.reply - overview.focus.reply).toLocaleString()}</li>
                                    <ul>
                                        <li>{t("dashboard.summary.stats_all.replies_others_to", {user: user.name})}: {overview.all.to_monitored.toLocaleString()}</li>
                                        <li>{t("dashboard.summary.stats_all.replies_others_others")}: {(overview.tweet_kind.reply - overview.focus.reply - overview.all.to_monitored).toLocaleString()}</li>
                                    </ul>
                                </ul>
                            </Grid>
                        </React.Fragment>}

                        {abusive.all.count === 0 && overview.all.count > 0 && <Grid item xs={12}><Alert severity="info">{t("dashboard.summary.stats_abusive.none", {user: user.name, platform: user.platform})}</Alert></Grid>}

                        {abusive.all.count > 0 && <React.Fragment>

                            <Grid item xs={12}>
                                <Typography variant={"body1"}>{t("dashboard.summary.stats_abusive.description", {user: user.name})}</Typography>
                            </Grid>

                            <Grid p={2} item xs={4} data-cy="abusiveTotalTweets">
                                {t("dashboard.summary.stats_abusive.unique", { posts: abusive.all.count.toLocaleString(), authors: abusive.all.tweet_authors.toLocaleString() })}
                                <ul>
                                    <li data-cy="abusiveOriginals">{t("dashboard.summary.stats_abusive.originals")}: {abusive.tweet_kind.original.toLocaleString()}</li>
                                    <li data-cy="abusiveRepliesTo">{t("dashboard.summary.stats_abusive.replies_to", {user: user.name})}: {abusive.all.to_monitored.toLocaleString()}</li>
                                    <li data-cy="abusiveRepliesOther">{t("dashboard.summary.stats_abusive.replies_other", {user: user.name})}: {(abusive.tweet_kind.reply - abusive.all.to_monitored).toLocaleString()}</li>
                                </ul>
                            </Grid>

                            <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "0px" }} />

                            <Grid p={2} item xs={4} data-cy="abuseTweetsRetweets">
                                {t("dashboard.summary.stats_abusive.selected_total", {user: user.name, percentage: (100 * abusive.all.count / (overview.all.count - overview.focus.total )).toFixed(2) })}
                                <ul>
                                    <li data-cy="datasetSize">{t("dashboard.summary.stats_abusive.selected_all")}: {overview.all.count.toLocaleString()}</li>
                                    <li data-cy="tweetsByFocus">{t("dashboard.summary.stats_abusive.selected_by", {user: user.name})}: {overview.focus.total.toLocaleString()}</li>
                                </ul>
                                {t("dashboard.summary.stats_abusive.selected_other", { user: user.name, posts: (overview.all.count - overview.focus.total).toLocaleString() })}
                            </Grid>

                            <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "0px" }} />

                            {abusive.all.to_monitored > 0 && <Grid p={2} item xs={4} data-cy="abuseReplies">
                                {t("dashboard.summary.stats_abusive.all_replies_to_total", { user: user.name, percentage: (100 * abusive.all.to_monitored / overview.all.to_monitored).toFixed(2) })}
                                <ul>
                                    <li data-cy="allRepliesTo">{t("dashboard.summary.stats_abusive.all_replies_to", {user: user.name})}: {overview.all.to_monitored.toLocaleString()}</li>
                                    <li data-cy="abusiveRepliesToFocus">{t("dashboard.summary.stats_abusive.all_replies_to_abusive", {user: user.name})}: {abusive.all.to_monitored.toLocaleString()}</li>
                                </ul>

                            </Grid>}

                        </React.Fragment>}

                    </Grid>
                    </React.Fragment>)

            })}

            <Dialog
                open={openUser}
                onClose={handleCloseUser}
                maxWidth="md"
                data-cy="triggesOpenUser">
                <DialogContent>
                    <User screen_name={screenName} anonymousMode={anonymousMode} addToQuery={props.addToQuery} />
                </DialogContent>
            </Dialog>

        </Box>

    )
}
export default withTranslation()(AccountsSummary);
