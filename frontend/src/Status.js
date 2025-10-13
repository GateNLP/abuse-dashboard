import React from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";

const Status = (props) => {

    const message = props.message

    return (
        <Box mt={5}>
            <Grid component={Paper}
                  container
                  spacing={3}
                  alignItems="flex-start"
                  data-cy="statusMessage">
                <Grid item xs={12}>
                    <Typography variant={"h6"} style={{paddingBottom: 3}}>{message}</Typography>
                </Grid>
            </Grid>
        </Box>
    )
}
export default Status;