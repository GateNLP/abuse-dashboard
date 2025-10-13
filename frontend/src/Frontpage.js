import React, { useEffect, useState } from "react";

import { Box } from "@mui/material";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { useTranslation } from 'react-i18next';

import axios from "axios";

import Journalist from "./components/frontpage/FrontpageUser";

import Alert from '@mui/material/Alert';

import LinearProgress from "@mui/material/LinearProgress";

const Frontpage = () => {

    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation();

    const windowUrl = window.location.search;
    const params = new URLSearchParams(windowUrl);

    const showHidden = params.has("hidden");

    const [journalist_details, setDetails] = useState(null);

    useEffect(() => {
        if (journalist_details == null) {

            axios.get("./dashboards")
                .then((response) => {

                    setDetails(response.data);
                })
                .catch((error) => {
                    console.log(error);
                    setDetails(error);
                });
        }
    });


    return (
        <React.Fragment>

            <Grid container>
                <Grid item xs={12}>
                    <Typography>
                        {t('frontpage.description')}
                    </Typography>
                </Grid>
            </Grid>

            <Box m={3} />

            {journalist_details === null ?
                <LinearProgress />
                :
                journalist_details.message === null || journalist_details.message === undefined ?
                    <Grid container alignItems={"center"} justifyContent={"flex-start"}>
                        <Box mb={5} />
                        {journalist_details.map((journalist, index) => {

                            if (!showHidden && journalist.hidden) return null;

                            return (<Grid key={index} item xs={3}>
                                <Journalist
                                    name={journalist.name}
                                    country={journalist.description}
                                    img={journalist.image}
                                    path={journalist.path}
                                    platforms={journalist.platforms}
                                />
                            </Grid>)
                        })}
                    </Grid>
                    :
                    <Alert severity="error">
                        <Typography>
                            Unfortunately an erorr occured retrieving the list of available dashboards. Please try again later.
                        </Typography>
                        {journalist_details?.message}
                    </Alert>
            }

            <Box m={5} />

        </React.Fragment>
    )
};

export default Frontpage;