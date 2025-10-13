import React from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

import customStyles from "../../branding/customStyles";

import { getPlatformIcon } from "../../api";

const FrontpageUser = (props) => {

    const classes = customStyles()

    return (
        <Card className={classes.journalistCard} variant={"outlined"}>
            <Grid container direction="row">
                <Grid item xs={4} style={{ borderColor: "green" }}>
                    <img
                        onError={({ currentTarget }) => {
                            currentTarget.onerror = null; // prevents looping
                            currentTarget.src = "../default_profile_normal.png";
                        }}
                        style={{ objectFit: "contain", maxHeight: "120px", paddingLeft:"10px" }}
                        height="100%"

                        width="100%"
                        src={props.img}
                        alt={props.name + " profile image"}
                        onClick={() => window.open("./" + props.path + "/")}
                    />
                </Grid>
                <Grid item xs={8}>
                    <CardContent sx={{paddingTop: "10px"}}
                        onClick={() => window.open("./" + props.path + "/")}>
                        <Typography  className={classes.journalistName}>{props.name}</Typography>
                        {
                            props.platforms.map((platform, i) => {
                                return <span key={i}>{getPlatformIcon(platform, {color:"silver"})}</span>
                            })
                        }
                    </CardContent>
                </Grid>
            </Grid>
        </Card>
    )
}

export default FrontpageUser;
