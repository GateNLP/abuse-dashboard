import React, {useState, useEffect} from "react";
import {useDispatch, useSelector} from "react-redux";

import Container from '@mui/material/Container';
import {Box, Button, TextField} from "@mui/material";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";
import Grid from "@mui/material/Grid";

import LinearProgress from "@mui/material/LinearProgress";

import TweetSummary from "../Results/TweetSummary"
import TweetStatistics from "../Results/Statistics"
import RepliesExplorer from "../Results/RepliesExplorer"

import Alert from '@mui/material/Alert';

import Countdown from 'react-countdown';
import {setConversationInput} from "../redux/actions/conversationActions";
import Status from "../Status";

import { useTranslation } from 'react-i18next';

const Conversation = (props) => {

    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    const dispatch = useDispatch();

    const conversationInputUrl = useSelector(state => state.conversation.url);
    const flashType = useSelector(state => state.conversation.flashType);
    const flashMessage = useSelector(state => state.conversation.flashMessage);
    const flashRefresh = useSelector(state => state.conversation.flashRefresh);
    const tweet = useSelector(state => state.conversation.tweet)

    const fail = useSelector(state => state.conversation.failed);
    const done = useSelector(state=> state.conversation.done)
    const loading = useSelector(state => state.conversation.loading);

    const tabs = props.tabs || null;

    const [userInput, setUserInput] = useState(conversationInputUrl);

    // make sure we link the input field state with the main persistent state
    useEffect(() => {
        setUserInput(conversationInputUrl)
     },[conversationInputUrl])

    const submitUrl = (src) => {
        dispatch(setConversationInput(src))
    };

    // Renderer callback with condition
    const renderer = ({ hours, minutes, seconds, completed }) => {
        if (completed) {
            // Render a completed state
            return <span>{this("refresh_reloading")}</span>;
        } else {
            // Render a countdown
            // can't use evalKeyword as seconds isn't within it's scope
            // eslint-disable-next-line
            return <span>{t("dashboard.conversation.refresh_countdown", {seconds: seconds})}</span>;
        }
    };
  
    return (
        <Container>
          <Box my={4}/>

            <Card>
                <CardHeader
                    title={t("dashboard.conversation.section_explore_from")}
                    
                />
                <Box p={3}>
                    <Grid
                        container
                        direction="row"
                        spacing={3}
                        alignItems="center"
                        data-cy="conversationSummary"
                    >
                        <Grid item xs data-cy="conversationInput">
                            <TextField
                                id="standard-full-width"
                                label={t("dashboard.conversation.urlbox")}
                                placeholder={t("dashboard.conversation.urlbox_placeholder")}
                                fullWidth
                                value={userInput || ""}
                                variant="outlined"
                                onChange={e => setUserInput(e.target.value)}
                                onKeyPress={e => {
                                    if (e.key === 'Enter') {
                                        submitUrl(userInput);
                                    }
                                  }}
                            />

            
                        </Grid>

                        <Grid item data-cy="conversationSubmit">
                            <Button data-cy="btnExplore" variant="contained" color="primary" onClick={() => submitUrl(userInput)}>
                                {t("dashboard.conversation.button_explore_tweet") || ""}
                            </Button>

                        </Grid>

                    </Grid>
                </Box>
            </Card>

            {flashMessage ? <Box mt={3}><Alert severity={flashType}>{flashMessage}
            {flashRefresh === true ?
                <Countdown date={Date.now() + 30000} renderer={renderer} onComplete={() => submitUrl(conversationInputUrl)}  />
                : null
            }</Alert></Box> : null }


            {tweet ? <TweetSummary tabs={props.tabs} addToQuery={props.addToQuery} addToReport={props.addToReport} /> : null}

            {loading && <LinearProgress/>}

            <Box m={2}/>
            {done && !fail && tweet.number_of_replies > 0 ?
                <Box>
                    <RepliesExplorer addToQuery={props.addToQuery} addToReport={props.addToReport} tabs={tabs}/>
                    <TweetStatistics tabs={tabs}/>
                </Box>
                : null}

            {done && fail ? <Status message={t("dashboard.conversation.error")}/> : null}


        </Container>
    )
};
export default Conversation;