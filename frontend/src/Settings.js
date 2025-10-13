import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Grid from "@mui/material/Grid";

import Cookies from "js-cookie";

import { useTranslation } from 'react-i18next';

import {
  Switch,
  FormControlLabel,
  TextField,
  Typography,
  Box,
  Paper,
  Select,
  MenuItem
} from "@mui/material";
import {
  setAnonymousMode,
  setMaxCSVRows,
  setComplianceMode,
} from "./redux/actions/dashboardActions";


export function secondsToDhms(seconds) {
  seconds = Number(seconds);
  var d = Math.floor(seconds / (3600 * 24));
  var h = Math.floor((seconds % (3600 * 24)) / 3600);
  var m = Math.floor((seconds % 3600) / 60);
  var s = Math.floor(seconds % 60);

  var dDisplay = d > 0 ? d + (d === 1 ? " day " : " days ") : "";
  var hDisplay = h > 0 ? h + (h === 1 ? " hour " : " hours ") : "";
  var mDisplay = m > 0 ? m + (m === 1 ? " minute " : " minutes ") : "";
  var sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
  return dDisplay + hDisplay + mDisplay + sDisplay;
}


const Settings = () => {

  //i know i've added i18n and it isn't used. sorry linter.
  //eslint-disable-next-line
  const { t, i18n } = useTranslation();

  const location = useSelector(state => state.dashboard.location)

  const [language, setLanguage] = useState(Cookies.get("i18next") || "en");

  const handleChangeLocale = (e) => {
    const lang = e.target.value;
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const dispatch = useDispatch();

  //manage anonymous mode
  function updateAnonymousMode(anonModeState) {
    dispatch(setAnonymousMode(anonModeState));
  }
  const anonymousMode = useSelector(
    (state) => state.dashboard.settings.anonymousMode
  );

  function updateComplianceMode(complianceMode) {
    dispatch(setComplianceMode(complianceMode));
  }
  const complianceMode = useSelector(
    (state) => state.dashboard.settings.complianceMode
  );

  /*
  //manage abuse count threshold
  function updateAbuseThreshold(abuseThreshold) {
    dispatch(setAbuseThreshold(abuseThreshold));
  }
  const abuseThreshold = useSelector(
    (state) => state.dashboard.settings.abuseThreshold
  );

  //manage abuse retweet threshold
  function updateAbuseRetweetThreshold(abuseRetweetThreshold) {
    dispatch(setAbuseRetweetThreshold(abuseRetweetThreshold));
  }
  const abuseRetweetThreshold = useSelector(
    (state) => state.dashboard.settings.abuseRetweetThreshold
  );
  */


  //max number of rows in the tweet CSV files
  function updateMaxCSVRows(maxCSVRows) {
    dispatch(setMaxCSVRows(maxCSVRows));
  }
  const maxCSVRows = useSelector(
    (state) => state.dashboard.settings.maxCSVRows
  );

  return (
    (<Box mt={3}>
      <Grid
        component={Paper}
        container
        direction="row"
        p={2}
        alignItems="flex-start"
        data-cy="settingsImdt"
      >
        <Grid item xs={12} data-cy="settingsImdtHeader">
          <Typography variant={"h6"} style={{ paddingBottom: 3 }}>
            {t('dashboard.settings.immediate')}
          </Typography>
        </Grid>

        <Grid item xs={12} data-cy="settingsLanguage">
          <Typography style={{ display: "inline", marginRight: 10, marginLeft: 16 }}>
            {t('dashboard.settings.language.title')}
          </Typography>
          <Select
            variant="standard"
            id="idLanguage"
            type="text"
            value={language}
            onChange={handleChangeLocale}>
            {Object.keys(location.languages).map((code,key) => (
              <MenuItem key={key} value={code}>{location.languages[code].name} ({code})</MenuItem>
            ))}
          </Select>
          <Typography variant={"body1"} paragraph>{t('dashboard.settings.language.description')}</Typography>
        </Grid>

        <Grid item xs={12} data-cy="settingsMaxCSV">
          <Typography style={{ display: "inline", marginRight: 10, marginLeft: 16 }}>
            {t('dashboard.settings.maxCSVRows.title')}:
          </Typography>
          <TextField
            variant="standard"
            id="idMaxCSVRows"
            type="number"
            value={maxCSVRows}
            onChange={(e) => {
              updateMaxCSVRows(e.target.value);
            }} />
          <Typography variant={"body1"} paragraph>{t('dashboard.settings.maxCSVRows.description')}</Typography>
        </Grid>

        <Grid item xs={12} >
          <FormControlLabel
            control={
              <Switch id="settingsAnonMode"
                checked={anonymousMode}
                onChange={(e) => {
                  updateAnonymousMode(!anonymousMode);
                }}
              />
            }
            labelPlacement="start"
            label={<Typography>{t('dashboard.settings.anonymousMode.title')}:</Typography>}
          />
          <Typography variant={"body1"} paragraph>{t('dashboard.settings.anonymousMode.description')}</Typography>
        </Grid>

        {!location.strict && location.decay ? <Grid item xs={12} data-cy="settingsCompMode">
          <FormControlLabel
            control={
              <Switch
                checked={complianceMode}
                onChange={(e) => {
                  updateComplianceMode(!complianceMode);
                }}
              />
            }
            labelPlacement="start"
            label={<Typography>{t('dashboard.settings.complianceMode.title')}:</Typography>}
          />
          <Typography variant={"body1"} paragraph>{t('dashboard.settings.complianceMode.description')}</Typography>
          </Grid> : null }

      </Grid>
      {/*<Box mt={5} />

      <Grid
        component={Paper}
        container
        direction="row"
        spacing={3}
        alignItems="flex-start"
        data-cy="settingsUpdate"
      >
        <Grid item xs={12} data-cy="settingsUpdateHeader">
          <Typography variant={"h6"} style={{ paddingBottom: 3 }}>
            {t('dashboard.settings.afterUpdate')}
          </Typography>
        </Grid>

        <Grid item xs={12} data-cy="settingsAbuseReplyTH">
          <Typography style={{ display: "inline", marginRight: 10, marginLeft: 16 }}>
            {t('dashboard.settings.abusiveReplies.title')}
          </Typography>
          <TextField
            id="idAbuseReplyThreshold"
            type="number"
            value={abuseThreshold}
            onChange={(e) => {
              updateAbuseThreshold(e.target.value);
            }}
          />
          <Typography variant={"body1"} paragraph>{t('dashboard.settings.abusiveReplies.description')}</Typography>
        </Grid>

        <Grid item xs={12} data-cy="settingsAbuseRetweetTH">
          <Typography style={{ display: "inline", marginRight: 10, marginLeft: 16 }}>
            {t('dashboard.settings.abusiveRetweets.title')}
          </Typography>
          <TextField
            id="idAbuseRetweetThreshold"
            type="number"
            value={abuseRetweetThreshold}
            onChange={(e) => {
              updateAbuseRetweetThreshold(e.target.value);
            }}
          />
          <Typography variant={"body1"} paragraph>{t('dashboard.settings.abusiveRetweets.description')}</Typography>
        </Grid>

      </Grid>*/}
    </Box>)
  );
};

export default Settings;
