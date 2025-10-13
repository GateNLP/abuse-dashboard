import React from "react";
import { useDispatch, useSelector } from "react-redux";
import useMyStyles from "../MaterialUiStyles/useMyStyles";
import Grid from "@mui/material/Grid";
import ReactWordcloud from 'react-wordcloud';
import { select } from "d3-selection";
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';

import { Box, Button, Divider } from "@mui/material";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";

import { FormControl, FormControlLabel, FormGroup } from "@mui/material"

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Alert from '@mui/material/Alert';


import TweetList from "./TweetList"
import User from "./User"
import { Checkbox } from "@mui/material";

import CategoryLabel from "./CategoryLabel"

import { default as HashtagIcon } from "../images/Hashtag";
import AlternateEmailOutlinedIcon from '@mui/icons-material/AlternateEmailOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';

import { ReactComponent as AboutIcon } from "../images/About.svg"
import Tooltip from "@mui/material/Tooltip";

import { useTranslation } from 'react-i18next';

import ConversationAPI from "../api"
import {setConversationFilter, setConversationRestriction, setTweetID} from "../redux/actions/conversationActions";
import UserMenu from "../components/buttons/UserMenu";

const conversationAPI = ConversationAPI()

const RepliesExplorer = (props) => {

    const classes = useMyStyles();

    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    const dispatch = useDispatch();

    const conversation = useSelector(state => state.conversation.conversation);
    const tweet = useSelector(state => state.conversation.tweet);

    const categories = useSelector(state => state.conversation.categories);

    const tweetID = tweet.id

    const hashtagCloud = useSelector(state => state.conversation.cloud)
    const urlTableData = conversation.urls
    const users = conversation.users

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);

    const tabs = props.tabs || null;

    var filter = useSelector(state => state.conversation.filter)
    var restrict = useSelector(state => state.conversation.restriction)

    function getCallback(callback) {
        return function (word, event) {
            const isActive = callback !== "onWordMouseOut";
            const element = event.target;
            const text = select(element);
            text
                /*.on("click", () => {
                    if (isActive) {
                        handleOpenHashtag(word.text, word.value);
                    }
                })*/
                .transition()
                .attr("font-weight", isActive ? "bold" : "normal");
        };
    }

    const options = {
        rotations: 2,
        rotationAngles: [0, 90],
        fontSizes: [15, 30],
        // TODO pull this automatically from somewhere?
        fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
        enableOptimizations: true,
        deterministic: true
    };

    const callbacks = {
        onWordClick: getCallback("onWordClick"),
        onWordMouseOut: getCallback("onWordMouseOut"),
        onWordMouseOver: getCallback("onWordMouseOver")
    }

    const submitID = (src) => {
        dispatch(setTweetID(src));
    };

    const changeFilter = (event) => {
        const changing = event.target.name;
        
        if (filter.includes(changing)) {
            filter = filter.filter(item => item !== changing)
        }
        else {
            filter.push(changing);
        }

        dispatch(setConversationFilter(filter));
    };

    const changeRestriction = (event) => {

        const changing = event.target.name;
        
        if (restrict.includes(changing)) {
            restrict = restrict.filter(item => item !== changing)
        }
        else {
            restrict.push(changing);
        }

        dispatch(setConversationRestriction(restrict));
    }

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

    const [openHashtag, setOpenHashtag] = React.useState(false);
    const [hashtag, setHashtag] = React.useState(null);

    // eslint-disable-next-line
    const [hashtagCount, setHashtagCount] = React.useState(null);

    const handleOpenHashtag = (hashtag, value) => {
        setHashtag(hashtag);
        setHashtagCount(value);
        setOpenHashtag(true);
    };

    const handleCloseHashtag = () => {
        setOpenHashtag(false);
        setHashtag(null);
    };

    const moreTweets = (tweet.replies_processed !== tweet.number_of_replies)
    const tweetsProcessed = Math.floor(100 * (tweet.replies_processed / tweet.number_of_replies));

    // eslint-disable-next-line
    const filterPercent = tweet.replies_processed === 0 ? 0 : Math.floor(100 * (conversation.number_of_replies / tweet.replies_processed));

    const style = {
        fill: "black",
        height: "0.9em",
        width: "0.9em",
        verticalAlign:"middle",
        marginRight: "15px"
    }

    return (
        (<Box mt={3}>
            <Card>
                <CardHeader
                    title={t("dashboard.conversation.section_replies_explorer")}
                    action={<Tooltip title={t("dashboard.conversation.tooltip_responses")}><AboutIcon style={{ fill: "white", height: 30, width: 30, paddingTop: 9, verticalAlign:"text-bottom" }}/></Tooltip>}
                    className={classes.headerUpladedImage}/>
            
                <Box p={3}>
                    {moreTweets ?
                    <Box mb={3}><Alert severity="info">{t("dashboard.conversation.more_tweets_prefix", {percentage: tweetsProcessed.toFixed()})} <Button size="small" variant="outlined" onClick={() => submitID(tweet.id)}>{t("dashboard.conversation.button_refresh")}</Button> {t("dashboard.conversation.more_tweets_suffix")}</Alert></Box>
                    : null }
                
                    <Grid
                        container
                        direction="row"
                        spacing={3}
                        alignItems="flex-start"
                        data-cy="conversationReplies">

                        <Grid item xs={3} >
                            <Typography variant="h6">{t("dashboard.conversation.filter_by")}</Typography>
                            <Box m={2}/>
                            <FormControl
                                variant="standard"
                                component="fieldset"
                                style={{width: "100%"}}
                                data-cy="conversationAbuseFilter">
                                <Typography variant="overline" style={{ color: "#B0B0B0"}}>{t("dashboard.conversation.category_description")}</Typography>
                                <FormGroup>

                                {Object.keys(categories).map((row, key) => (
                                    <Grid
                                        container
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        key={key}>

                                        <Grid item xs>
                                            <CategoryLabel title={t("dashboard.conversation.categories."+row)} color={categories[row].color}/>
                                        </Grid>
                                        <Grid item>
                                            <FormControlLabel label="" control={<Checkbox color="primary" name={row} onChange={changeFilter} checked={filter.includes(row)} />} />
                                        </Grid>

                                    </Grid>
                                ))}

                                </FormGroup>
                            </FormControl>
                            <Box m={4}/>
                            <FormControl
                                variant="standard"
                                component="fieldset"
                                style={{ width: "100%" }}
                                data-cy="conversationContainsFilter">
                                <Typography variant="overline" style={{ color: "#B0B0B0" }}>{t("dashboard.conversation.replies_filter_contain")}</Typography>
                                <FormGroup>
                                    <Grid
                                        container
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center"
                                        >
                                        <Grid item xs>
                                            <span style={{ display: "inline-block", minWidth: "15ch", fontSize: "14px", fontWeight: "600", paddingTop: "12px", paddingBottom: "12px"}}><HashtagIcon style={style} /> {t("dashboard.conversation.contains_hashtags")}</span>
                                        </Grid>
                                        <Grid item>
                                            <FormControlLabel label="" control={<Checkbox color="primary" name="hashtags" onChange={changeRestriction} checked={restrict.includes("hashtags")} />} />
                                        </Grid>
                                    </Grid>

                                    {/*<Grid
                                        container
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center">
                                        <Grid item xs>
                                            <span style={{ display: "inline-block", minWidth: "15ch", fontSize: "14px", fontWeight: "600", paddingTop: "12px", paddingBottom: "12px"}}><AlternateEmailOutlinedIcon style={style} /> {t("dashboard.conversation.contains_user_mentions")}</span>
                                        </Grid>
                                        <Grid item>
                                            <FormControlLabel label="" control={<Checkbox color="primary" name="user_mentions" onChange={changeRestriction} checked={restrict.includes("user_mentions")} />} />
                                        </Grid>
                                    </Grid>*/}

                                    <Grid
                                        container
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="center">
                                        <Grid item xs>
                                            <span style={{ display: "inline-block", minWidth: "15ch", fontSize: "14px", fontWeight: "600", paddingTop: "12px", paddingBottom: "12px"}}><LinkOutlinedIcon style={style} /> {t("dashboard.conversation.contains_urls")}</span>
                                        </Grid>
                                        <Grid item>
                                            <FormControlLabel label="" control={<Checkbox color="primary" name="urls" onChange={changeRestriction} checked={restrict.includes("urls")} />}/>
                                        </Grid>
                                    </Grid>
                                </FormGroup>
                            </FormControl>

                            <Box m={4}/>

                            <div>
                                <Typography variant="overline" style={{ color: "#B0B0B0" }}>{t("dashboard.conversation.replies_filter_statistics")}</Typography>
                                <Grid
                                    container
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                    data-cy="conversationReplyStats">
                                    <Grid item xs>
                                        <span style={{ display: "inline-block", minWidth: "15ch", fontSize: "14px", fontWeight: "600", paddingTop: "12px", paddingBottom: "12px"}}>{t("dashboard.conversation.statistics_known")}</span>
                                    </Grid>
                                    <Grid item>
                                        <Typography style={{ minWidth: "15ch", fontSize: "14px"}} variant="body1">{conversationAPI.formatLargeNumber(tweet.number_of_replies)}</Typography>
                                    </Grid>
                                </Grid>
                                <Grid
                                    container
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center">
                                    <Grid item xs>
                                        <span style={{ display: "inline-block", minWidth: "15ch", fontSize: "14px", fontWeight: "600", paddingTop: "12px", paddingBottom: "12px"}}>{t("dashboard.conversation.statistics_filtered")}</span>
                                    </Grid>
                                    <Grid item>
                                        <Typography style={{ minWidth: "15ch", fontSize: "14px"}} variant="body1">{conversationAPI.formatLargeNumber(conversation.number_of_replies)} ({filterPercent}%)</Typography>
                                    </Grid>
                                </Grid>
                            </div>
                        </Grid>
                    
                        <Divider orientation="vertical" flexItem variant="middle" style={{marginRight:"-1px", marginLeft: "-16px"}}/>
                        
                        {conversation.number_of_replies > 0 ?
                        <React.Fragment>
                            <Grid item xs={6} data-cy="conversationReplyTable">
                                    <Typography variant="h6">{t("dashboard.conversation.replies_filtered", {tweets: conversation.number_of_replies.toLocaleString()})}</Typography>
                                    <Box m={2} />
                                    <TweetList addToReport={props.addToReport} addToQuery={props.addToQuery} stance={filter} id_str={tweetID} tabs={tabs} height="80vh" keyword={t} categories={categories} restrict={restrict.join()} />
                            </Grid>
                            <Divider orientation="vertical" flexItem variant="middle" style={{marginRight:"-1px", marginLeft: 0}}/>
                            <Grid item xs={3} data-cy="conversationReplyHashtag">
                                <div style={{ opacity: hashtagCloud.length > 0 ? 1 : 0.5 }}>
                                    <Typography variant="h6">{t("dashboard.conversation.the_hashtags")}</Typography>
                                    {hashtagCloud.length < 1 ? <Box p={2}><Typography variant="body1">{t("dashboard.conversation.hashtags_none")}</Typography></Box> : null}
                                    <div style={{ height: "calc(80vh - 56px)" }}>
                                        <ReactWordcloud words={hashtagCloud} options={options} callbacks={callbacks} />
                                    </div>
                                    <Dialog
                                        open={openHashtag}
                                        onClose={handleCloseHashtag}
                                        maxWidth="sm">
                                        <DialogContent>
                                            <Typography variant="h3">{hashtag}</Typography>
                                            <Typography variant="body1">{t("dashboard.conversation.hashtags_summary", {count: hashtagCount, hashtag: hashtag})}</Typography>
                                            <Button color="primary" size="small" style={{ textTransform: "none" }} onClick={() => window.open(`https://twitter.com/hashtag/${hashtag}?f=live`, `blank`)}>{t("dashboard.conversation.hashtags_view_on_twitter")}</Button>
                                            <TweetList addToReport={props.addToReport} tabs={tabs} stance={filter} hashtag={hashtag} id_str={tweetID} keyword={t} restrict={restrict} categories={categories} />
                                        </DialogContent>

                                    </Dialog>
                                </div>
                            </Grid>
                        </React.Fragment> : 
                        
                        <Grid item xs><Alert severity="warning">{t("dashboard.conversation.no_matches")}</Alert></Grid>}
                    </Grid>

                    {conversation.number_of_replies > 0 ?
                    <React.Fragment>
                        <Box mt={3} mb={3}>
                            <Divider variant="fullWidth" orientation="horizontal" />                    
                        </Box>
                        <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="conversationReplyUU">

                            <Grid item xs={8} data-cy="conversationReplyURL">
                                <div style={{ opacity: Object.keys(urlTableData).length > 0 ? 1 : 0.5 }}>
                                    <Typography variant="h6">{t("dashboard.conversation.the_urls")}</Typography>
                                    
                                    <Box p={2}><Typography variant="body1">{Object.keys(urlTableData).length > 0 ? t("dashboard.conversation.table_description_urls", {topX: Object.keys(urlTableData).length === 10 ? t("dashboard.conversation.table_urls_10") : ""}) : t("dashboard.conversation.urls_none")}</Typography></Box>
                                    {Object.keys(urlTableData).length > 0 ?
                                        <TableContainer component={Paper}>
                                            <Table className={classes.table} aria-label="simple table">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>{t("dashboard.conversation.table_header_url")}</TableCell>
                                                        <TableCell>{t("dashboard.conversation.table_header_appearances")}</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {Object.keys(urlTableData).map((row, key) => (
                                                        <TableRow key={key}>
                                                            <TableCell><Link href={row} target="_blank" underline="hover">{row}</Link></TableCell>
                                                            <TableCell>{urlTableData[row].toLocaleString()}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer> : ""}
                                </div>
                            </Grid>

                            <Divider orientation="vertical" flexItem variant="middle" style={{marginRight:"-1px", marginLeft:0}}/>

                            <Grid item xs={4} data-cy="conversationReplyUsers">
                                <div>
                                    <Typography variant="h6">{t("dashboard.conversation.the_people")}</Typography>
                                    <Box p={2}><Typography variant="body1">{t("dashboard.conversation.table_description_users", {topX: Object.keys(users).length === 10 ? t("dashboard.conversation.table_users_10") : ""})}</Typography></Box>
                                    <TableContainer component={Paper}>
                                        <Table data-cy="conversationReplyUser" className={classes.table} aria-label="simple table">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>{t("dashboard.conversation.table_header_screen_name")}</TableCell>
                                                    <TableCell>{t("dashboard.conversation.table_header_tweets")}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {Object.keys(users).map((screen_name, key) => (
                                                    <TableRow key={key}>
                                                        {/*<TableCell><Link href="#" onClick={(e) => handleOpenUser(e, screen_name)}>{screen_name}</Link></TableCell>*/}
                                                        <TableCell><UserMenu tabs={tabs} platform={users[screen_name].platform} screen_name={screen_name} addToQuery={props.addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser}/></TableCell>
                                                        <TableCell>{users[screen_name].posts.toLocaleString()} ({(100 * users[screen_name].posts / conversation.number_of_replies).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                    <Dialog
                                        open={openUser}
                                        onClose={handleCloseUser}
                                        maxWidth="md"
                                        data-cy="convUserOpen">
                                        <DialogContent>
                                            <Grid
                                                container
                                                direction="row"
                                                spacing={3}
                                                alignItems="flex-start">
                                                <Grid item xs={6} data-cy="convUserSN">
                                                    <User screen_name={screenName} addToQuery={props.addToQuery} />
                                                </Grid>

                                                <Grid item xs={6} data-cy="convUserTweetList">
                                                    <TweetList addToReport={props.addToReport} addToQuery={props.addToQuery} tabs={tabs} stance={filter} screen_name={screenName} id_str={tweetID} height="75vh" keyword={t} />
                                                </Grid>

                                            </Grid>
                                        </DialogContent>

                                    </Dialog>
                                </div>
                            </Grid>

                        
                        </Grid>
                    </React.Fragment> : null }
                </Box>
            </Card>
        </Box>)
    );
}

export default RepliesExplorer;