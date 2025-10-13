import React from "react";
import {useSelector} from "react-redux";
import useMyStyles from "../MaterialUiStyles/useMyStyles";
import Grid from "@mui/material/Grid";
import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale.css';

import {Box, Divider} from "@mui/material";
import Card from "@mui/material/Card";
import CardHeader from "@mui/material/CardHeader";

import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";

//import Plot from 'react-plotly.js';
import Plotly from 'plotly.js-dist-min'

import createPlotlyComponent from 'react-plotly.js/factory';
import { ReactComponent as AboutIcon } from "../images/About.svg"

import { useTranslation } from 'react-i18next';

const Plot = createPlotlyComponent(Plotly);

const TweetStatistics = () => {

    const classes = useMyStyles();
    
    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    const tweet = useSelector(state => state.conversation.tweet);

    const stance = useSelector(state => state.conversation.stance)


    stance.labels = [];
    // convert the stance labels to whatever they are in the current language
    // TODO figure out why this needs the || protection, i.e. why does it get
    //      run multiple times causing the labels to get messed up?
    for (var i = 0 ; i < stance["ids"].length ; ++i) {

        //console.log(stance["ids"][i])
        // I think the reason this was so complex was because it was also being updated
        // in the saga, so there was a bit of a race going on as to who was fixing it
        //stance["labels"][i] = tweet.category_labels[stance["labels"][i]]?.name || stance["labels"][i];
        stance["labels"].push(t("dashboard.conversation.categories."+stance["ids"][i]));


        if (tweet.timeline) {
            //tweet.timeline[i]["name"] = tweet.category_labels[tweet.timeline[i]["name"]]?.name || tweet.timeline[i]["name"];
            tweet.timeline[i]["name"] = stance["labels"][i];
        }
            
    }

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
                    title={t("dashboard.conversation.section_statistics")}
                    className={classes.headerUpladedImage}
                />
                <Box p={3}>
                    <Grid
                        container
                        direction="row"
                        spacing={3}
                        alignItems="flex-start">

                        <Grid item xs={4} >
                            <Typography variant="h6"><Tooltip title={t("dashboard.conversation.tooltip_piechart")}><AboutIcon style={{ fill: "black", height: "1.5em", width: "1.5em", verticalAlign:"text-bottom" }}/></Tooltip> {t("dashboard.conversation.distribution_piechart")}</Typography>
                
                            <Plot style= {{width:"100%"}} data={[stance]} layout={ { autosize:true, showlegend: false }} useResizeHandler={true} config = {{'displayModeBar': false}} />
                
                        </Grid>

                        <Divider orientation="vertical" flexItem variant="middle" style={{marginRight:"-1px", marginLeft:0}}/>

                        <Grid item xs={8}>
                            <Typography variant="h6"><Tooltip title={t("dashboard.conversation.tooltip_histogram")}><AboutIcon style={{ fill: "black", height: "1.5em", width: "1.5em", verticalAlign:"text-bottom" }}/></Tooltip> {t("dashboard.conversation.distribution_histogram")}</Typography>
                            {tweet.timeline ?
                            
                                <Plot style= {{width:"100%"}} data={tweet.timeline} layout={layout} useResizeHandler={true} config = {{'displayModeBar': false}} />
                            
                                :
                                <Typography variant="body1">{t("dashboard.conversation.summary_histogram_day")}</Typography>
                            }
                        </Grid>
                    </Grid>
                </Box>
            </Card>
        </Box>
    )
}

export default TweetStatistics;