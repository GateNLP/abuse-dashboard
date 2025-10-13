import React from "react";
import Typography from "@mui/material/Typography";

import CategoryLabel from "./CategoryLabel";

import uniqueId from "lodash/uniqueId";

import TweetView from "./TweetView";

export default function CategorisedTweet(props) {

    return (
        <div style={{border: "4px solid "+props.data.color, padding: 15, borderRadius: "12px"}}>
            <div style={{display: 'flex', textAlign:"left"}}>
                <Typography component="div" style={{ flexGrow: 1, display: "flex", alignContent: "center", flexDirection: "column", justifyContent: "center" }}><CategoryLabel title={props.category} color={props.data.color}/></Typography>
            </div>
            <TweetView addToReport={props.addToReport} id={uniqueId('tweet-')} addToQuery={props.addToQuery} tabs={props.tabs} data={props.data}/>
        </div>
    )
}