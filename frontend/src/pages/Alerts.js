import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import useMyStyles from "../MaterialUiStyles/useMyStyles";
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import DownloadIcon from "@mui/icons-material/SaveAlt";

import EditIcon from "@mui/icons-material/Edit";

import { Button, Box, Divider, TextareaAutosize, useTheme, Collapse, Tab, Tabs } from "@mui/material";
import { TabContext, TabPanel } from "@mui/lab";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import User from "../Results/User"

import TweetTable from "../Results/TweetTable";

import Paper from '@mui/material/Paper';

import Status from "../Status";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { withTranslation, Trans } from "react-i18next";

import { getAlerts } from "../redux/actions/alertsActions";
import makeStyles from '@mui/styles/makeStyles';

import { scaleLog } from 'd3-scale';
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import NoChangeIcon from "@mui/icons-material/DragHandle";
import UnknownIcon from "@mui/icons-material/Help";
import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";

import ViewIcon from '@mui/icons-material/VisibilityOutlined';

import PDFReport from "../components/buttons/PDFReport"
import { Image, Link as PDFLink } from '@react-pdf/renderer';

import UserMenu from "../components/buttons/UserMenu";

import { getFlagEmoji, getCountryName, getAccountLink } from "../api";

const zLogScale = scaleLog([2, 1000], [0.4, 1.0]);

const useZScoreStyles = makeStyles((theme) => ({
    bar: {
        borderRadius: "0.25em",
        height: "1em",
        width: "7.5em",
        position: "relative",
        display: "inline-block",
        marginRight: theme.spacing(1),

        /* Green-yellow-red gradient generated using
         * https://www.joshwcomeau.com/gradient-generator?colors=00ff00|ffa500|ff0000&angle=90&colorMode=hcl&precision=8&easingCurve=0.28879310344827586|0.6941675646551724|0.23275862068965517|0.008822737068965518
         */
        backgroundImage: `linear-gradient(
            90deg,
            hsl(120deg 100% 50%) 0%,
            hsl(87deg 100% 47%) 8%,
            hsl(71deg 100% 43%) 13%,
            hsl(57deg 100% 42%) 18%,
            hsl(46deg 100% 47%) 22%,
            hsl(39deg 100% 50%) 26%,
            hsl(34deg 100% 50%) 31%,
            hsl(29deg 100% 50%) 38%,
            hsl(23deg 100% 50%) 46%,
            hsl(16deg 100% 50%) 59%,
            hsl(0deg 100% 50%) 100%
        );`,
    },
    overlay: {
        backgroundColor: "lightgrey",
        position: "absolute",
        zIndex: 1,
        right: 0,
        top: 0,
        bottom: 0,
    },
    marker: {
        borderRight: `1px solid lightgrey`,
        position: "absolute",
        zIndex: 2,
        top: 0,
        bottom: 0,
    },
    marker1: {
        left: "20%"
    },
    marker2: {
        left: "40%"
    },
}), {
    // this is a bit of a hack - if the name starts with "Mui" then the generated
    // class names from this set of styles are fixed, e.g. "MuiZScoreBar-overlay".
    // If the name is not provided or does not start "Mui" then you get a different
    // class name every time you call the useZScoreStyles() hook, which clutters
    // up the page with hundreds of functionally-identical CSS rules.
    name: "MuiZScoreBar",
});

const ZScoreBar = (props) => {
    const { z, ...rootProps } = props;
    const zScoreClasses = useZScoreStyles();

    let barLength = 0;
    if (z < 0 || z === "Infinity" || z === "NaN") {
        // clamp negative values to 0%
        barLength = 0;
    } else if (z <= 2) {
        // +1 SD = 20%, +2 SD = 40%, linear scale
        barLength = z * 0.2;
    } else if (z > 1000) {
        // clamp 1000 as 100%
        barLength = 1;
    } else {
        // in between 2 and 1000, scale logarithmically from 40 to 100%
        barLength = zLogScale(z);
    }

    const w = (1.0 - barLength) * 100

    return (
        <div className={zScoreClasses.bar} {...rootProps}>
            <div className={zScoreClasses.overlay} style={{ width: `${w}%` }} />
            <div className={`${zScoreClasses.marker} ${zScoreClasses.marker1}`} />
            <div className={`${zScoreClasses.marker} ${zScoreClasses.marker2}`} />
        </div>
    )
};



const colorCircle = (z_score) => {

    if (z_score === "Infinity") return "silver";

    if (z_score === "NaN") return "green";

    if (z_score < 1) return "green";

    if (z_score < 2) return "orange";

    return "red"

}

const formatMean = (mean, z_score) => {
    if (z_score === "Infinity") return "";

    const rounded = mean.toFixed(0)

    if (rounded > 0) return rounded;

    return "< 1";
}

function AlertIcon({ z, style = {}, ...rest }) {

    let Symbol = NoChangeIcon;
    if (z === "Infinity") {
        Symbol = UnknownIcon;
    } else if (z < 0) {
        Symbol = ArrowDownwardIcon;
    } else if (z > 0) {
        Symbol = ArrowUpwardIcon;
    }

    return (<Symbol style={{ ...style, color: colorCircle(z) }} {...rest} />);
}

function getArrowImageURL(z) {
    
    if (z === 0 || z === "NaN") return "no-change.png";
    if (z < 0) return "down.png";
    
    const color = colorCircle(z);

    if (color === "silver") return "unknown.png";

    return "up-"+color+".png";    
}

const AlertsUserTable = withTranslation()((props) => {
    const { t, users, handleOpenUser, anonymousMode, addToQuery, tabs, view, abusive, watched=null } = props;
    const classes = useMyStyles();
    const theme = useTheme();

    return (
        (<TableContainer component={Paper} style={{ width: "97%" }}>
            <Table stickyHeader data-cy="triggersAuthorTable" className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("dashboard.alerts.screen_name")}</TableCell>
                        <TableCell>{t("dashboard.alerts.posts")}</TableCell>
                        <TableCell>{t("dashboard.alerts.mean")}</TableCell>
                        {view && <TableCell></TableCell>}
                        {/*<TableCell>Z-Score</TableCell>*/}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {users.map((user, key) => (
                        <TableRow key={key}>
                            <TableCell>
                                <div style={{ display: "flex", alignItems: "center", columnGap: theme.spacing(1) }}>
                                    <AlertIcon z={user.z_score} />
                                    <UserMenu tabs={tabs} platform={user.platform} screen_name={user.screen_name} addToQuery={addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser} />
                                </div>
                            </TableCell>
                            <TableCell><ZScoreBar z={user.z_score} /> {user.week}</TableCell>
                            <TableCell>{formatMean(user.mean, user.z_score)}</TableCell>
                            {view && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched, authors: [user.screen_name]}}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>)
    );
});

const AlertsHashtagTable = withTranslation()((props) => {
    const { t, hashtags, addToQuery, view, abusive, watched=null } = props;
    const classes = useMyStyles();
    const theme = useTheme();

    return (
        (<TableContainer component={Paper} style={{ width: "97%" }}>
            <Table stickyHeader className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("dashboard.alerts.hashtag")}</TableCell>
                        <TableCell>{t("dashboard.alerts.posts")}</TableCell>
                        <TableCell>{t("dashboard.alerts.mean")}</TableCell>
                        {view && <TableCell></TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {hashtags.map((hashtag, key) => (
                        <TableRow key={key}>
                            <TableCell>
                                <div style={{ display: "flex", alignItems: "center", columnGap: theme.spacing(1) }}>
                                    <AlertIcon z={hashtag.z_score} />
                                    <Link
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); addToQuery(hashtag.hashtag, "hashtag"); }}
                                        underline="hover">{hashtag.hashtag}</Link>
                                </div>
                            </TableCell>
                            <TableCell><ZScoreBar z={hashtag.z_score} /> {hashtag.week}</TableCell>
                            <TableCell>{formatMean(hashtag.mean, hashtag.z_score)}</TableCell>
                            {view && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched, hashtags: [hashtag.hashtag]}}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>)
    );
});

const AlertsCountryTable = withTranslation()((props) => {
    const { t, i18n, countries, addToQuery, view, abusive, watched } = props;
    const classes = useMyStyles();
    const theme = useTheme();

    const cnames = new Intl.DisplayNames([i18n?.language || "en"], { type: 'region' });

    return (
        (<TableContainer component={Paper} style={{ width: "97%" }}>
            <Table stickyHeader className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("dashboard.alerts.country")}</TableCell>
                        <TableCell>{t("dashboard.alerts.posts")}</TableCell>
                        <TableCell>{t("dashboard.alerts.mean")}</TableCell>
                        {view && <TableCell></TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {countries.map((item, key) => (
                        <TableRow key={key}>
                            <TableCell>
                                <div style={{ display: "flex", alignItems: "center", columnGap: theme.spacing(1) }}>
                                    <AlertIcon z={item.z_score} />
                                    <Link
                                        href="#"
                                        onClick={(e) => { e.preventDefault(); addToQuery(item.country, "country"); }}
                                        underline="hover">{getFlagEmoji(item.country) + " " + getCountryName(cnames, item.country)}</Link>
                                </div>
                            </TableCell>
                            <TableCell><ZScoreBar z={item.z_score} /> {item.week}</TableCell>
                            <TableCell>{formatMean(item.mean, item.z_score)}</TableCell>
                            {view && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched, countries: [item.country]}}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>)
    );
});

const AlertsIndicatorTable = withTranslation()((props) => {

    const { t, data, indicators, view, abusive, watched=null } = props;

    const classes = useMyStyles();
    const theme = useTheme();

    return (
        (<TableContainer component={Paper} style={{width: "97%"}}>
            <Table stickyHeader className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("dashboard.alerts.indicator")}</TableCell>
                        <TableCell>{t("dashboard.alerts.posts")}</TableCell>
                        <TableCell>{t("dashboard.alerts.mean")}</TableCell>
                        {view && <TableCell></TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {indicators.map((i, key) => 
                        <TableRow key={key}>
                            <TableCell>
                                <div style={{ display: "flex", alignItems: "center", columnGap: theme.spacing(1) }}>
                                    <AlertIcon z={data[i].z_score} />
                                    {t("dashboard.alerts.indicators."+i)}
                                </div>
                            </TableCell>
                            <TableCell><ZScoreBar z={data[i].z_score} /> {data[i].week}</TableCell>
                            <TableCell>{formatMean(data[i].mean, data[i].z_score)}</TableCell>

                            {/*"government","business","threats","misogynistic"*/}

                            {view && data[i].week > 0 && i === "government" && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched, accountTypes: ["Government"]}}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                            {view && data[i].week > 0 && i === "business" && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched, accountTypes: ["Business"]}}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                            {view && data[i].week > 0 && i === "threats" && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched}, query: "entities.OffensiveLookup.threat.keyword:(death OR rape)"}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                            {view && data[i].week > 0 && i === "misogynistic" && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched, abuseTypes: {mode: "any", terms: ["sexist", "sexual", "gendered reputation"]}}}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                            {view && data[i].week === 0 && <TableCell></TableCell>}
                        </TableRow>)}
                </TableBody>
            </Table>
        </TableContainer>)
    );
});

const AlertsAffiliatesTable = withTranslation()((props) => {
    const { t, data, view, abusive, watched=null } = props;
    const classes = useMyStyles();
    const theme = useTheme();

    return (
        (<TableContainer component={Paper} style={{ width: "97%" }}>
            <Table stickyHeader className={classes.table}>
                <TableHead>
                    <TableRow>
                        <TableCell>{t("dashboard.alerts.affiliatesOf")}</TableCell>
                        <TableCell>{t("dashboard.alerts.posts")}</TableCell>
                        <TableCell>{t("dashboard.alerts.mean")}</TableCell>
                        {view && <TableCell></TableCell>}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.map((item, key) => (
                        <TableRow key={key}>
                            <TableCell>
                                <div style={{ display: "flex", alignItems: "center", columnGap: theme.spacing(1) }}>
                                    <AlertIcon z={item.z_score} />
                                    {item.description} <img alt="" src={item.badge} style={{height:"1.25em", verticalAlign: "text-bottom"}}/>
                                </div>
                            </TableCell>
                            <TableCell><ZScoreBar z={item.z_score} /> {item.week}</TableCell>
                            <TableCell>{formatMean(item.mean, item.z_score)}</TableCell>

                            {/* this hard codes the tweet annotation location which in the backend is a variable
                                it shouldn't matter for any of our current indices but could be a problem with old ones.
                                should probably add affiliated with to the main filter then can use that instead of a
                                query string, would also avoid any encoding issues etc. */}

                            {view && <TableCell><Link
                                href="#"
                                onClick={(e) => { e.preventDefault(); view({abusive: abusive, filter: {watched: watched}, query:'entities.Tweet.user.affiliated_with.url.url.keyword:"'+item.account+'"'}) }}
                                underline="hover"><ViewIcon/></Link></TableCell>}
                            

                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>)
    );
});


const Alerts = (props) => {

    const { t, i18n } = props;

    const cnames = new Intl.DisplayNames([i18n?.language || "en"], { type: 'region' });

    const dispatch = useDispatch();

    const location = useSelector(state => state.dashboard.location)

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);
    const complianceMode = useSelector((state) => state.dashboard.settings.complianceMode);

    // tweet table display options
    const [displayOriginals, setDisplayOriginals] = useState(true)
    const [displayReplies, setDisplayReplies] = useState(true)

    const alerts = useSelector(state => state.alerts.alerts);
    const loading = useSelector(state => state.alerts.loading);
    const failed = useSelector(state => state.alerts.failed);
    const done = useSelector(state => state.alerts.done);

    const [openUser, setOpenUser] = React.useState(false);

    const [openWatched, setOpenWatched] = React.useState(false);

    const [openDescription, setOpenDescription] = React.useState(false);

    const [screenName, setScreenName] = React.useState(null);

    const [tweets, setTweets] = React.useState(null);

    const [tab, setTab] = React.useState('abusive');
        const handleTabChange = (event, newValue) => {
        setTab(newValue);
    }

    const handleViewTweets = (settings) => {
        setTweets({
            ...settings,
            from: "now-1w",
            to: "now",
            sort: 0
        });
    }

    const handleCloseTweets = () => {
        setTweets(null);
    }

    const handleOpenUser = (screen_name) => {
        setScreenName(screen_name);
        setOpenUser(true);
    };

    const handleCloseUser = () => {
        setOpenUser(false);
        setScreenName(null);
    };

    const handleOpenWatched = () => {
        setOpenWatched(true);
    }

    const handleCloseWatched = () => {
        setOpenWatched(false);
    }

    const toggleDescription = () => {
        setOpenDescription(!openDescription);
    }

    var numWatched = alerts?.watched?.watched?.terms?.length + alerts?.watched?.watched?.hashtags?.length;


    var watchedData = localStorage.getItem(location.suffix+"watched")

    
    if (watchedData) watchedData = JSON.parse(watchedData)

    const watched = useRef(watchedData?.terms?.join("\n") || "");
    const hashtags = useRef(watchedData?.hashtags?.join("\n") || "");

    const update = () => {
        setOpenWatched(false);

        const data = {
            terms:  watched.current.value.split("\n").filter(Boolean),
            hashtags: hashtags.current.value.split("\n").filter(Boolean)
        }

        localStorage.setItem(location.suffix+"watched", JSON.stringify(data))

        dispatch(getAlerts(data));
    }

    if (loading) {
        return <LinearProgress />
    }

    else if (done && failed) {
        return <Status message={t("dashboard.alerts.error")} />
    }

    const tabs = props.tabs || null;

    const tweetDisplayOptions = {
        displayOriginal: displayOriginals,
        displayReply: displayReplies,
        updateOriginal: setDisplayOriginals,
        updateReply: setDisplayReplies
    }

    if (alerts.all.everything.week === 0) {
        return (
            <div>{t("dashboard.alerts.none")}</div>
        )
    }

    var items = 1;

    return (
        (<Box mt={1}>
            <Grid container
                direction="row"
                p={2}
                alignItems="flex-start"
                data-cy="decaySummary">
                <Grid item xs={12} data-cy="decayHeader">
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant={"body1"}>{t("dashboard.alerts.help.simple")}</Typography>
                        <Tooltip title={`${openDescription ? "Hide" : "Show more"} details`}>
                            <IconButton onClick={toggleDescription} size="large">
                                <InfoIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Collapse in={openDescription}>
                        <Typography paragraph variant={"body1"}>{t("dashboard.alerts.help.par1")}</Typography>
                        <ul>
                            <Typography component="li" variant="body1"><ZScoreBar z={-1} /> <AlertIcon z={-1} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.help.lower")}</Typography>
                            <Typography component="li" variant="body1"><ZScoreBar z={0} /> <AlertIcon z={0} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.help.normal")}</Typography>
                            <Typography component="li" variant="body1"><ZScoreBar z={0.7} /> <AlertIcon z={0.7} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.help.higher")}</Typography>
                            <Typography component="li" variant="body1"><ZScoreBar z={1.8} /> <AlertIcon z={1.8} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.help.unusual")}</Typography>
                            <Typography component="li" variant="body1"><ZScoreBar z={30} /> <AlertIcon z={30} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.help.exceptional")}</Typography>
                        </ul>
                        <Typography paragraph variant={"body1"}><Trans i18nKey="dashboard.alerts.help.par2">ignore this <AlertIcon z="Infinity" style={{ verticalAlign: "middle" }} /></Trans></Typography>
                        <Typography paragraph variant={"body1"}>{t("dashboard.alerts.help.par3")}</Typography>
                    </Collapse>
                </Grid>
            </Grid>
            <TabContext value={tab} >
                      <Box
                        sx={{ display: "flex" }}
                      >
                        <Tabs value={tab}
                          onChange={handleTabChange}
                          orientation="vertical" style={{ minWidth: 120 }}
                          sx={{ borderRight: 1, borderColor: 'divider' }}>
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.alerts.all.tab")} value="dataset" />
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.alerts.abusive.tab")} value="abusive" />
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.alerts.watched.tab")} value="watched" />
                        </Tabs>

                        <TabPanel value={"dataset"}>
                        <Grid
                container
                direction="row"
                spacing={3}
                alignItems="flex-start"
                data-cy="decaySummary">

                <Grid item xs={12} data-cy="decayHeader">
                    <Typography variant={"h5"}>{t("dashboard.alerts.all.title")}</Typography>
                </Grid>

                <Grid p={2} item xs={12}>
                    <Typography component="div" variant={"body1"}><ZScoreBar z={alerts.all.everything.z_score} /> <AlertIcon z={alerts.all.everything.z_score} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.all.posts", { posts: alerts.all.everything.week.toLocaleString() })}</Typography>
                </Grid>

                <Grid p={2} item xs={6}>
                    <Typography variant={"h6"}>{t("dashboard.alerts.indicators.posters")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.all.accounts")}
                        type="table"
                        headings={[t("dashboard.alerts.screen_name"), t("dashboard.alerts.platform"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(user, col) => {
                            if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(user.z_score)}/> <PDFLink src={getAccountLink(user.platform, user.screen_name)}>{user.screen_name}</PDFLink></React.Fragment>
                            if (col === 1) return user.platform
                            if (col === 2) return user.week
                            if (col === 3) return formatMean(user.mean, user.z_score)
                        }}
                        rows={alerts.all.users}/></Typography>
                    <Typography variant={"body1"} paragraph>{t("dashboard.alerts.all.accounts")}</Typography>
                    <AlertsUserTable
                        users={alerts.all.users}
                        handleOpenUser={handleOpenUser}
                        anonymousMode={anonymousMode}
                        addToQuery={props.addToQuery}
                        tabs={props.tabs}
                        view={handleViewTweets}
                        abusive={false}
                    />
                </Grid>

                {alerts.all.hashtags.length > 0 && <React.Fragment>
                    {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                    <Grid p={2} item xs={6}>
                    <Typography variant={"h6"}>{t("dashboard.alerts.indicators.hashtags")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.all.hashtags")}
                        type="table"
                        headings={[t("dashboard.alerts.hashtag"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(hashtag, col) => {
                            if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(hashtag.z_score)}/> {hashtag.hashtag}</React.Fragment>
                            if (col === 1) return hashtag.week
                            if (col === 2) return formatMean(hashtag.mean, hashtag.z_score)
                        }}
                        rows={alerts.all.hashtags}/></Typography>
                    <Typography variant={"body1"} paragraph>{t("dashboard.alerts.all.hashtags")}</Typography>
                    <AlertsHashtagTable
                        hashtags={alerts.all.hashtags}
                        addToQuery={props.addToQuery}
                        view={handleViewTweets}
                        abusive={false}
                    />
                    
                </Grid></React.Fragment>}

                {alerts.all.countries.length > 0 && <React.Fragment>
                    {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                    <Grid p={2} item xs={6}>
                    <Typography variant={"h6"}>{t("dashboard.alerts.indicators.proximity")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.all.countries")}
                        type="table"
                        headings={[t("dashboard.alerts.country"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(country, col) => {
                            if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(country.z_score)}/> {getFlagEmoji(country.country)} {getCountryName(cnames, country.country)}</React.Fragment>
                            if (col === 1) return country.week
                            if (col === 2) return formatMean(country.mean, country.z_score)
                        }}
                        rows={alerts.all.countries}/></Typography>
                    <Typography variant={"body1"} paragraph>{t("dashboard.alerts.all.countries")}</Typography>
                    <AlertsCountryTable
                        countries={alerts.all.countries}
                        addToQuery={props.addToQuery}
                        view={handleViewTweets}
                        abusive={false}
                    />
                </Grid></React.Fragment>}

                {alerts.all.affiliatedWith.length > 0 && <React.Fragment>
                {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                <Grid p={2} item xs={6}>
                        <Typography variant={"h6"}>{t("dashboard.alerts.indicators.affiliatedWith")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.all.affiliatedWith")}
                        type="table"
                        headings={[t("dashboard.alerts.affiliatesOf"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(account, col) => {
                            if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(account.z_score)}/>  {account.description}</React.Fragment>
                            if (col === 1) return account.week
                            if (col === 2) return formatMean(account.mean, account.z_score)
                        }}
                        rows={alerts.all.affiliatedWith}/></Typography>
                        <Typography variant={"body1"} paragraph>{t("dashboard.alerts.all.affiliatedWith")}</Typography>
                        <AlertsAffiliatesTable
                            data={alerts.all.affiliatedWith}
                            view={handleViewTweets}
                            abusive={false}
                        />
                </Grid></React.Fragment>}

                {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    

                <Grid p={2} item xs={6}>
                    <Typography variant={"h6"}>{t("dashboard.alerts.indicators.other")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.all.other")}
                        type="table"
                        headings={[t("dashboard.alerts.indicator"),t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(indicator, col) => {
                            return indicator[col];
                        }}
                        rows={[
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.all.government.z_score)}/> {t("dashboard.alerts.indicators.government")}</React.Fragment>, alerts.all.government.week, formatMean(alerts.all.government.mean, alerts.all.government.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.all.business.z_score)}/> {t("dashboard.alerts.indicators.business")}</React.Fragment>, alerts.all.business.week, formatMean(alerts.all.business.mean, alerts.all.business.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.all.threats.z_score)}/> {t("dashboard.alerts.indicators.threats")}</React.Fragment>, alerts.all.threats.week, formatMean(alerts.all.threats.mean, alerts.all.threats.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.all.misogynistic.z_score)}/> {t("dashboard.alerts.indicators.misogynistic")}</React.Fragment>, alerts.all.misogynistic.week, formatMean(alerts.all.misogynistic.mean, alerts.all.misogynistic.z_score)],
                        ]}/></Typography>
                    <Typography variant={"body1"} paragraph>{t("dashboard.alerts.all.other")}</Typography>
                    <AlertsIndicatorTable
                        data={alerts.all}
                        indicators={["government","business","threats","misogynistic"]}
                        view={handleViewTweets}
                        abusive={false}/>

                    

                </Grid>

                {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
            </Grid>

                        </TabPanel>

                        <TabPanel value={"abusive"}>
                        <Grid
                container
                direction="row"
                spacing={3}
                alignItems="flex-start"
                data-cy="decaySummary">

                <Grid item xs={12} data-cy="decayHeader">
                    <Typography variant={"h5"}>{t("dashboard.alerts.abusive.title")}</Typography>
                </Grid>

                {alerts.abusive.everything.week !== 0 && (items = 1) === 1 &&
                    <React.Fragment>
                        <Grid p={2} item xs={12} className={alerts.status.triggered ? "borderBlink" : ""}>
                            <Typography component="div" variant={"body1"}><ZScoreBar z={alerts.abusive.everything.z_score} /> <AlertIcon z={alerts.abusive.everything.z_score} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.abusive.posts", { posts: alerts.abusive.everything.week.toLocaleString() })}</Typography>
                        </Grid>

                        <Grid p={2} item xs={6}>
                        <Typography variant={"h6"}>{t("dashboard.alerts.indicators.posters")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.abusive.accounts")}
                        type="table"
                        headings={[t("dashboard.alerts.screen_name"), t("dashboard.alerts.platform"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(user, col) => {
                            if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(user.z_score)}/> <PDFLink src={getAccountLink(user.platform, user.screen_name)}>{user.screen_name}</PDFLink></React.Fragment>
                            if (col === 1) return user.platform
                            if (col === 2) return user.week
                            if (col === 3) return formatMean(user.mean, user.z_score)
                        }}
                        rows={alerts.abusive.users}/></Typography>
                            <Typography variant={"body1"} paragraph>{t("dashboard.alerts.abusive.accounts")}</Typography>
                            <AlertsUserTable
                                users={alerts.abusive.users}
                                handleOpenUser={handleOpenUser}
                                anonymousMode={anonymousMode}
                                addToQuery={props.addToQuery}
                                tabs={props.tabs}
                                view={handleViewTweets}
                                abusive={true}
                            />
                        </Grid>


                        {alerts.abusive.hashtags.length > 0 && <React.Fragment>
                            {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                            <Grid p={2} item xs={6}>
                            <Typography variant={"h6"}>{t("dashboard.alerts.indicators.hashtags")} <PDFReport addToReport={props.addToReport}
                                title={t("dashboard.alerts.abusive.hashtags")}
                                type="table"
                                headings={[t("dashboard.alerts.hashtag"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                                render={(hashtag, col) => {
                                    if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(hashtag.z_score)}/> {hashtag.hashtag}</React.Fragment>
                                    if (col === 1) return hashtag.week
                                    if (col === 2) return formatMean(hashtag.mean, hashtag.z_score)
                                }}
                                rows={alerts.abusive.hashtags}/></Typography>
                            <Typography variant={"body1"} paragraph>{t("dashboard.alerts.abusive.hashtags")}</Typography>
                            <AlertsHashtagTable
                                hashtags={alerts.abusive.hashtags}
                                addToQuery={props.addToQuery}
                                view={handleViewTweets}
                                abusive={true}
                            />
                        </Grid></React.Fragment>}

                        {alerts.abusive.countries.length > 0 && <React.Fragment>
                            {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                            <Grid p={2} item xs={6}>
                            <Typography variant={"h6"}>{t("dashboard.alerts.indicators.proximity")} <PDFReport addToReport={props.addToReport}
                                title={t("dashboard.alerts.abusive.countries")}
                                type="table"
                                headings={[t("dashboard.alerts.country"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                                render={(country, col) => {
                                    if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(country.z_score)}/> {getFlagEmoji(country.country)} {getCountryName(cnames, country.country)}</React.Fragment>
                                    if (col === 1) return country.week
                                    if (col === 2) return formatMean(country.mean, country.z_score)
                                }}
                                rows={alerts.abusive.countries}/></Typography>
                            <Typography variant={"body1"} paragraph>{t("dashboard.alerts.abusive.countries")}</Typography>
                            <AlertsCountryTable
                                countries={alerts.abusive.countries}
                                addToQuery={props.addToQuery}
                                view={handleViewTweets}
                                abusive={true}
                            />
                        </Grid></React.Fragment>}

                        {alerts.abusive.affiliatedWith.length > 0 && <React.Fragment>
                        {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                        <Grid p={2} item xs={6}>
                            <Typography variant={"h6"}>{t("dashboard.alerts.indicators.affiliatedWith")} <PDFReport addToReport={props.addToReport}
                                title={t("dashboard.alerts.abusive.affiliatedWith")}
                                type="table"
                                headings={[t("dashboard.alerts.affiliatesOf"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                                render={(account, col) => {
                                    if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(account.z_score)}/> {account.description}</React.Fragment>
                                    if (col === 1) return account.week
                                    if (col === 2) return formatMean(account.mean, account.z_score)
                                }}
                                rows={alerts.abusive.affiliatedWith}/></Typography>
                            <Typography variant={"body1"} paragraph>{t("dashboard.alerts.abusive.affiliatedWith")}</Typography>
                            <AlertsAffiliatesTable
                                data={alerts.abusive.affiliatedWith}
                                view={handleViewTweets}
                                abusive={true}
                            />
                        </Grid></React.Fragment>}

                        {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}

                        <Grid p={2} item xs={6}>
                            <Typography variant={"h6"}>{t("dashboard.alerts.indicators.other")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.abusive.other")}
                        type="table"
                        headings={[t("dashboard.alerts.indicator"),t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(indicator, col) => {
                            return indicator[col];
                        }}
                        rows={[
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.abusive.government.z_score)}/> {t("dashboard.alerts.indicators.government")}</React.Fragment>, alerts.abusive.government.week, formatMean(alerts.abusive.government.mean, alerts.abusive.government.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.abusive.business.z_score)}/> {t("dashboard.alerts.indicators.business")}</React.Fragment>, alerts.abusive.business.week, formatMean(alerts.abusive.business.mean, alerts.abusive.business.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.abusive.threats.z_score)}/> {t("dashboard.alerts.indicators.threats")}</React.Fragment>, alerts.abusive.threats.week, formatMean(alerts.abusive.threats.mean, alerts.abusive.threats.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.abusive.misogynistic.z_score)}/> {t("dashboard.alerts.indicators.misogynistic")}</React.Fragment>, alerts.abusive.misogynistic.week, formatMean(alerts.abusive.misogynistic.mean, alerts.abusive.misogynistic.z_score)],
                        ]}/></Typography>
                            <Typography variant={"body1"} paragraph>{t("dashboard.alerts.abusive.other")}</Typography>
                            <AlertsIndicatorTable
                                data={alerts.abusive}
                                indicators={["government","business","threats","misogynistic"]}
                                view={handleViewTweets}
                                abusive={true}/>
                        </Grid>

                        {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    

                        <Grid p={2} item xs={6}>
                            <Typography variant={"h6"}>{t("dashboard.alerts.indicators.orchestrated")}</Typography>

                            {alerts.abusive.time.week !== -1 &&
                                <Typography component="div" paragraph variant={"body1"}>{alerts.abusive.time.z_score && <React.Fragment><ZScoreBar z={alerts.abusive.time.z_score} /> <AlertIcon z={alerts.abusive.time.z_score} style={{ verticalAlign: "middle" }} /></React.Fragment>}
                                {t("dashboard.alerts.abusive.orchestrated", {total: alerts.abusive.time.total, min1: alerts.abusive.time.week, min2: alerts.abusive.time.week+1})}</Typography>
                            }

                            {!alerts.abusive.time.valid && <Typography variant={"body1"} style={{fontStyle:"italic"}}>{t("dashboard.alerts.abusive.orchestrated_warning")}</Typography>}


                            {alerts.abusive.time.week === -1 &&
                                <Typography component="div" variant={"body1"}>{t("dashboard.alerts.abusive.orchestrated_none")}</Typography>
                            }
                        </Grid>

                        {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    

                    </React.Fragment>}                

                {alerts.abusive.everything.week === 0 &&
                    <Grid item xs={12}>
                        <Typography variant="body1">{t("dashboard.alerts.abusive.none")}</Typography>
                    </Grid>}

            </Grid>
                        </TabPanel>
                        
                        
                        <TabPanel value={"watched"}><Grid
                container
                direction="row"
                spacing={3}
                alignItems="flex-start"
                data-cy="decaySummary">

                <Grid item xs={12} data-cy="decayHeader">
                    <Typography variant={"h5"}>{t("dashboard.alerts.watched.title")} <Button style={{ float: "right" }} variant="contained" color="primary" onClick={() => handleOpenWatched()} data-cy="btnSettings"><EditIcon /> {t("dashboard.alerts.watched.edit")}</Button></Typography>
                </Grid>

                {numWatched > 0 && (items = 1) === 1 && <React.Fragment>
                    <Grid item xs={12}>
                        <Typography variant={"body1"}>{t("dashboard.alerts.watched.watchedTerms")}: {alerts.watched.watched.terms.join(", ")}</Typography>
                        <Typography variant={"body1"}>{t("dashboard.alerts.watched.watchedHashtags")}: {alerts.watched.watched.hashtags.join(", ")}</Typography>
                    </Grid>

                    <Grid p={2} item xs={12}>
                        {alerts.watched.everything.week === 0 && <Typography variant={"body1"} paragraph>
                            {t("dashboard.alerts.watched.none")}</Typography>}

                        {alerts.watched.everything.week !== 0 && <Typography variant={"body1"} component="div" paragraph><ZScoreBar z={alerts.watched.everything.z_score} /> <AlertIcon z={alerts.watched.everything.z_score} style={{ verticalAlign: "middle" }} /> {t("dashboard.alerts.watched.posts", { posts: alerts.watched.everything.week.toLocaleString() })}
                            <Link
                                title={t("dashboard.alerts.watched.download")}
                                href={"./tweets.csv?&query=_ALERTS_&sort=0&filterID=" + props.filterID}
                                download={encodeURIComponent(["watched", "terms", "alerts"].join("_")) + ".csv"}
                                underline="hover"><DownloadIcon style={{ verticalAlign: "middle" }} /></Link>
                        </Typography>}


                    </Grid>

                    {alerts.watched.users.length > 0 && <Grid p={2} item xs={6}>
                    <Typography variant={"h6"}>{t("dashboard.alerts.indicators.posters")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.watched.accounts")}
                        type="table"
                        headings={[t("dashboard.alerts.screen_name"), t("dashboard.alerts.platform"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(user, col) => {
                            if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(user.z_score)}/> <PDFLink src={getAccountLink(user.platform, user.screen_name)}>{user.screen_name}</PDFLink></React.Fragment>
                            if (col === 1) return user.platform
                            if (col === 2) return user.week
                            if (col === 3) return formatMean(user.mean, user.z_score)
                        }}
                        rows={alerts.watched.users}/></Typography>
                        <Typography variant={"body1"} paragraph>{t("dashboard.alerts.watched.accounts")}</Typography>
                        <AlertsUserTable
                            users={alerts.watched.users}
                            handleOpenUser={handleOpenUser}
                            anonymousMode={anonymousMode}
                            addToQuery={props.addToQuery}
                            tabs={props.tabs}
                            view={handleViewTweets}
                            abusive={false}
                            watched={{terms: alerts?.watched?.watched?.terms || [], hashtags: alerts?.watched?.watched?.hashtags | []}}
                        />
                    </Grid>}

                    {alerts.watched.hashtags.length > 0 && <React.Fragment>
                        {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                        <Grid p={2} item xs={6}>
                        <Typography variant={"h6"}>{t("dashboard.alerts.indicators.hashtags")} <PDFReport addToReport={props.addToReport}
                            title={t("dashboard.alerts.watched.hashtags")}
                            type="table"
                            headings={[t("dashboard.alerts.hashtag"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                            render={(hashtag, col) => {
                                if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(hashtag.z_score)}/> {hashtag.hashtag}</React.Fragment>
                                if (col === 1) return hashtag.week
                                if (col === 2) return formatMean(hashtag.mean, hashtag.z_score)
                            }}
                            rows={alerts.watched.hashtags}/></Typography>
                        <Typography variant={"body1"} paragraph>{t("dashboard.alerts.watched.hashtags")}</Typography>
                        <AlertsHashtagTable
                            hashtags={alerts.watched.hashtags}
                            addToQuery={props.addToQuery}
                            view={handleViewTweets}
                            abusive={false}
                            watched={{terms: alerts?.watched?.watched?.terms || [], hashtags: alerts?.watched?.watched?.hashtags | []}}
                        />
                    </Grid></React.Fragment>}

                    {alerts.watched.countries.length > 0 && <React.Fragment>
                        {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                        <Grid p={2} item xs={6}>
                        <Typography variant={"h6"}>{t("dashboard.alerts.indicators.proximity")} <PDFReport addToReport={props.addToReport}
                            title={t("dashboard.alerts.watched.countries")}
                            type="table"
                            headings={[t("dashboard.alerts.country"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                            render={(country, col) => {
                                if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(country.z_score)}/> {getFlagEmoji(country.country)} {getCountryName(cnames, country.country)}</React.Fragment>
                                if (col === 1) return country.week
                                if (col === 2) return formatMean(country.mean, country.z_score)
                            }}
                            rows={alerts.watched.countries}/></Typography>
                        <Typography variant={"body1"} paragraph>{t("dashboard.alerts.watched.countries")}</Typography>
                        <AlertsCountryTable
                            countries={alerts.watched.countries}
                            addToQuery={props.addToQuery}
                            view={handleViewTweets}
                            abusive={false}
                            watched={{terms: alerts?.watched?.watched?.terms || [], hashtags: alerts?.watched?.watched?.hashtags | []}}
                        />
                    </Grid></React.Fragment>}

                    {alerts.watched.affiliatedWith.length > 0 && <React.Fragment>
                    {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}
                    <Grid p={2} item xs={6}>
                        <Typography variant={"h6"}>{t("dashboard.alerts.indicators.affiliatedWith")} <PDFReport addToReport={props.addToReport}
                            title={t("dashboard.alerts.watched.affiliatedWith")}
                            type="table"
                            headings={[t("dashboard.alerts.affiliatesOf"), t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                            render={(account, col) => {
                                if (col === 0) return <React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(account.z_score)}/> {account.description}</React.Fragment>
                                if (col === 1) return account.week
                                if (col === 2) return formatMean(account.mean, account.z_score)
                            }}
                            rows={alerts.watched.affiliatedWith}/></Typography>
                        <Typography variant={"body1"} paragraph>{t("dashboard.alerts.watched.affiliatedWith")}</Typography>
                        <AlertsAffiliatesTable
                            data={alerts.watched.affiliatedWith}
                            view={handleViewTweets}
                            abusive={false}
                            watched={{terms: alerts?.watched?.watched?.terms || [], hashtags: alerts?.watched?.watched?.hashtags | []}}
                        />
                    </Grid></React.Fragment>}

                    {alerts.watched.users.length > 0 && <React.Fragment>
                    {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    
                    <Grid p={2} item xs={6}>
                        <Typography variant={"h6"}>{t("dashboard.alerts.indicators.other")} <PDFReport addToReport={props.addToReport}
                        title={t("dashboard.alerts.watched.other")}
                        type="table"
                        headings={[t("dashboard.alerts.indicator"),t("dashboard.alerts.posts"), t("dashboard.alerts.mean")]}
                        render={(indicator, col) => {
                            return indicator[col];
                        }}
                        rows={[
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.watched.government.z_score)}/> {t("dashboard.alerts.indicators.government")}</React.Fragment>, alerts.watched.government.week, formatMean(alerts.watched.government.mean, alerts.watched.government.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.watched.business.z_score)}/> {t("dashboard.alerts.indicators.business")}</React.Fragment>, alerts.watched.business.week, formatMean(alerts.watched.business.mean, alerts.watched.business.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.watched.threats.z_score)}/> {t("dashboard.alerts.indicators.threats")}</React.Fragment>, alerts.watched.threats.week, formatMean(alerts.watched.threats.mean, alerts.watched.threats.z_score)],
                            [<React.Fragment><Image style={{height:"12"}} src={location.prefix+"/arrows/"+getArrowImageURL(alerts.watched.misogynistic.z_score)}/> {t("dashboard.alerts.indicators.misogynistic")}</React.Fragment>, alerts.watched.misogynistic.week, formatMean(alerts.watched.misogynistic.mean, alerts.watched.misogynistic.z_score)],
                        ]}/></Typography>
                        <Typography variant={"body1"} paragraph>{t("dashboard.alerts.watched.other")}</Typography>
                        <AlertsIndicatorTable
                            data={alerts.watched}
                            indicators={["government","business","threats","misogynistic"]}
                            view={handleViewTweets}
                            abusive={false}
                            watched={{terms: alerts?.watched?.watched?.terms || [], hashtags: alerts?.watched?.watched?.hashtags | []}}
                        />
                    </Grid></React.Fragment>}
                   
                   {(items++) % 2 !== 0 && <Divider orientation="vertical" flexItem variant="middle" style={{ marginRight: "-1px", marginLeft: "-16px" }} />}    


                    {alerts.watched.everything.week > 0 && <Grid item xs={12}>
                        <TweetTable filter={{watched: {terms: alerts?.watched?.watched?.terms || [], hashtags: alerts?.watched?.watched?.hashtags | []}}} addToReport={props.addToReport} addToQuery={props.addToQuery} abusive="false" tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} sort="0" displayOptions={tweetDisplayOptions} />
                    </Grid>}

                </React.Fragment>}

                {(numWatched === 0 || isNaN(numWatched)) && <Grid item xs={12}>
                    <Typography variant={"body1"}>{t("dashboard.alerts.watched.getStarted")}</Typography>
                </Grid>}

            </Grid></TabPanel>
                        </Box>
            </TabContext>
            <Dialog
                open={tweets !== null}
                onClose={handleCloseTweets}
                maxWidth="md"
            >
                <DialogContent>
                    <TweetTable {...tweets} addToReport={props.addToReport} addToQuery={props.addToQuery} tabs={tabs} compliance={complianceMode} anonymize={anonymousMode} displayOptions={tweetDisplayOptions} />
                </DialogContent>
            </Dialog>
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
                open={openWatched}
                onClose={handleCloseWatched}
                maxWidth="md">
                <DialogContent>
                    <Typography variant={"h6"}>{t("dashboard.alerts.watched.dialog.title")}</Typography>


                    <Grid
                        container
                        direction="row"
                        spacing={3}
                        alignItems="flex-start"
                        data-cy="decaySummary">
                        <Grid item xs={6}>
                            <Typography variant={"body2"}>{t("dashboard.alerts.watched.dialog.terms")}</Typography>
                        </Grid>

                        <Grid item xs={6}>
                            <Typography variant={"body2"}>{t("dashboard.alerts.watched.dialog.hashtags")}</Typography>
                        </Grid>
                    </Grid>

                    <Grid
                        container
                        direction="row"
                        spacing={3}
                        alignItems="flex-start"
                        data-cy="decaySummary">
                        <Grid item xs={6}>
                            <TextareaAutosize
                                ref={watched}
                                defaultValue={watchedData?.terms.join("\n")}
                                minRows={15}
                                style={{ marginTop: 15, width: "100%" }}
                            />

                        </Grid>
                        <Grid item xs={6}>

                            <TextareaAutosize
                                ref={hashtags}
                                defaultValue={watchedData?.hashtags.join("\n")}
                                minRows={15}
                                style={{ marginTop: 15, width: "100%" }}
                            />
                        </Grid>
                    </Grid>
                    <Button data-cy="btnUpdate" variant="contained" color="primary" onClick={() => update()}>{t("dashboard.alerts.watched.dialog.save")}</Button>
                </DialogContent>
            </Dialog>
        </Box>)
    );
}

export default withTranslation()(Alerts);