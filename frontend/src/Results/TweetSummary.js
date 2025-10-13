import React from "react";
import {useDispatch, useSelector} from "react-redux";
import useMyStyles from "../MaterialUiStyles/useMyStyles";
import Grid from "@mui/material/Grid";
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';

import {Box, Button} from "@mui/material";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";

import Alert from '@mui/material/Alert';

import {setTweetID} from "../redux/actions/conversationActions";

import TweetView from "./TweetView"
import User from "./User"

import { useTranslation } from 'react-i18next';

const TweetSummary = (props) => {

    const classes = useMyStyles();
    
    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    const dispatch = useDispatch();

    const tweet = useSelector(state => state.conversation.tweet);
    
    const submitID = (src) => {
        dispatch(setTweetID(src));
    };

    let layout = {
        barmode: "stack",
        autosize:true,
        showlegend: true,
        xaxis: {
            range: tweet.range
        }
    }

    if (tweet.rangeSlider) {
       layout.xaxis.rangeslider = { }
    }

    return (
        <Box mt={3}>
            <Card>
                <CardHeader
                    title={t("dashboard.conversation.section_tweet_summary")}
                    className={classes.headerUpladedImage}
                />
                <Box p={3}>
                    <Grid
                        container
                        direction="row"
                        spacing={3}
                        alignItems="flex-start">
                        
                        <Grid item xs={6}>
                            {tweet.in_reply_to && tweet.conversation_id && tweet.in_reply_to !== tweet.conversation_id ? <Button variant="outlined" color="primary" onClick={() => submitID(tweet.conversation_id)}>{t("dashboard.conversation.button_explore_root")}</Button> : null }
                            {tweet.in_reply_to ? <Button variant="outlined" color="primary" onClick={() => submitID(tweet.in_reply_to)}>{t("dashboard.conversation.button_explore_parent")}</Button>  : null }
                            <TweetView tabs={props.tabs} addToReport={props.addToReport} addToQuery={props.addToQuery} data={tweet} />
                        </Grid>

                        <Grid item xs={6}>
                            <User screen_name={tweet.user.screen_name} addToQuery={props.addToQuery} tabs={props.tabs} />
                            {tweet.reply_count === 0 ? <Alert severity="warning">{t("dashboard.conversation.summary_no_replies")}</Alert> : "" }
                        </Grid>
                    </Grid>
                </Box>
            </Card>
        </Box>
    )
}

export default TweetSummary;