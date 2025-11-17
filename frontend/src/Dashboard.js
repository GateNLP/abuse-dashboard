import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  Box,
  List,
  Link,
  Tab,
  TextField,
  Button,
  TextareaAutosize,
  Tabs,
  FormControlLabel,
  Checkbox,
  Radio,
} from "@mui/material";

import withStyles from '@mui/styles/withStyles';

import { TabContext, TabPanel } from "@mui/lab";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";

import LinearProgress from "@mui/material/LinearProgress";
import IndexOverview from "./pages/IndexOverview"
import Conversation from "./pages/Conversation"
import AbusiveOverview from "./pages/AbusiveOverview"
import AbusiveTriggers from "./pages/AbusiveTriggers"
import UserSearch from "./pages/UserSearch"
import User from "./Results/UserSmall"
import Settings from "./Settings"
import TwitterDetails from "./pages/TwitterDetails";
import TikTokDetails from "./pages/TikTokDetails";
import YouTubeDetails from "./pages/YouTubeDetails";
import MastodonDetails from "./pages/MastodonDetails";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports.js";

import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import DatePicker from 'react-date-picker'

import Alert from '@mui/material/Alert';
import { getIndexOverview, setAppLocation } from "./redux/actions/dashboardActions";
import { forgetGraphs } from "./redux/actions/graphActions";

import SettingsIcon from "@mui/icons-material/Settings";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';

import WarningOutlined from '@mui/icons-material/WarningOutlined';

import Paper from '@mui/material/Paper';

import { useTranslation, Trans } from 'react-i18next';
import axios from "axios";

import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandIcon from '@mui/icons-material/ArrowDropDownCircle';

import { Snackbar } from "@mui/material";

import UserGroup from "./Results/UserGroup";
import { getPlatformIcon } from "./api";
import AccountsSummary from "./pages/AccountsSummary";
import PlatformSpecific from "./pages/PlatformSpecific";
import { forgetCoordination } from "./redux/actions/coordinationActions";
import FacebookDetails from "./pages/FacebookDetails";

// would it be better to load the whole thing so we could use it for other
// things or should be just do this for now for simplicity
const abuseIndexLabels = Object.keys(require('./locales/en/translation.json').dashboard.overview.abuse_types);

/**
 * Variant of {@link FormControlLabel} for vertically-stacked lists of checkboxes (like the language selectors).
 */
const FormControlLabelStacked = withStyles({
  root: {
    display: "flex",
    alignItems: "start"
  },
  label: {
    // push down the top of the first line of text to align with the checkbox
    paddingTop: "9px"
  }
})(FormControlLabel)

const Dashboard = () => {

  //i know i've added i18n and it isn't used. sorry linter.
  //eslint-disable-next-line
  const { t, i18n } = useTranslation()

  const dispatch = useDispatch();

  const location = useSelector(state => state.dashboard.location)
  var overview = useSelector(state => state.dashboard.overview);
  const user = useSelector(state => state.dashboard.user);
  const query = useSelector(state => state.dashboard.query);

  const alerts = useSelector(state => state.alerts.alerts);

  const intlLangs = new Intl.DisplayNames([i18n?.language || "en"], { type: 'language' });

  const langCodes = useSelector(state => state.dashboard.languages);

  function describeLanguage(lang) {

    var key = "dashboard.lang." + lang;

    if (i18n.exists(key)) return t(key);

    return intlLangs.of(lang);
  }

  const languages = [];

  const [checkedState, setCheckedState] = useState([]);

  if (langCodes != null) {
    langCodes.forEach((lng, i) => {
      languages.push({
        name: describeLanguage(lng),
        code: lng,
        index: i
      });
    });

    languages.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))

    if (checkedState.length === 0) setCheckedState(new Array(languages.length).fill(false));
  }


  const topicCodes = useSelector(state => state.dashboard.topics);
  const topics = [];

  const [topicStates, setTopicStates] = useState([]);

  const sources = useSelector(state => state.dashboard.sources);

  const [sourceStates, setSourceStates] = useState([]);

  if (sources != null && sourceStates.length === 0) {
    setSourceStates(new Array(sources.length).fill(false));
  }
  
  if (topicCodes != null) {
    
    topicCodes.forEach((code, i) => {
      topics.push({
        name: t("dashboard.overview.topics."+code),
        code: code,
        index: i
      });
    });

    topics.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0));
    
    if (topicStates.length === 0) setTopicStates(new Array(topics.length).fill(false));
  }

  const handleTopicChange = (position) => {
    const updatedState = topicStates.map((item, index) =>
      index === position ? !item : item
    );

    setTopicStates(updatedState);
  }

  const countryCodes = useSelector(state => state.dashboard.countries);
  const countries = [];

  const [countryStates, setCountryStates] = useState([]);

  function getCountryName(countries, countryCode) {
    try {
        return countries.of(countryCode)
    } catch {
        return "UNKNOWN ("+countryCode+")"
    }
  }


  if (countryCodes != null) {

    const countryNames = new Intl.DisplayNames([i18n?.language || "en"], { type: 'region' });

    countryCodes.forEach((country, i) => {
      countries.push({
        name: getCountryName(countryNames, country),
        code: country,
        index: i
      })
    })

    countries.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0));

    if (countryStates.length === 0) setCountryStates(new Array(countries.length).fill(false));
  }

  const handleCountryChange = (position) => {
    const updatedState = countryStates.map((item, index) =>
      index === position ? !item : item
    );

    setCountryStates(updatedState);
  }

  const [abuseTypesChecked, setAbuseTypesChecked] = useState([]);
  const abuseTypes = [];
  
  if (abuseTypes.length === 0) {
    abuseIndexLabels.forEach((code, i) => {

      if (code === "root" || code === "none") return;

      abuseTypes.push({
        name: t("dashboard.overview.abuse_types."+code),
        code: code,
        index: i
      })
    });

    abuseTypes.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0));

    if (abuseTypesChecked.length === 0) setAbuseTypesChecked(new Array(abuseTypes.length).fill(false))
  }

  const [abuseTypeMode, setAbuseTypeMode] = useState("any");


  const [accountTypesChecked, setAccountTypesChecked] = useState([]);
  const accountTypes = [];

  if (accountTypes.length === 0) {
    ["Government", "Business"].forEach((code, i) => {
      accountTypes.push({
        name: t("dashboard.filter.associated."+code),
        code: code,
        index: i
      })
    });

    accountTypes.sort((a, b) => (a.name.toLowerCase() > b.name.toLowerCase()) ? 1 : ((b.name.toLowerCase() > a.name.toLowerCase()) ? -1 : 0));

    if (accountTypesChecked.length === 0) setAccountTypesChecked(new Array(accountTypes.length).fill(false))
  }

  const [checkedUsers, setCheckedUsers] = useState([]);


  const userList = [];

  if (location?.users?.length > 0) {
    location.users.forEach((u, i) => {
      userList.push({
        name: u.name,
        handle: u.handle,
        platform: u.platform,
        index: i
      })
    })

    userList.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0))

    if (checkedUsers.length === 0) setCheckedUsers(new Array(userList.length).fill(false));
  }

  const buildLangFilter = () => {
    const selected = [];

    languages.forEach((lng) => {
      if (checkedState[lng.index]) selected.push(lng.code);
    });

    return selected;
  }

  const buildTopicFilter = () => {
    const selected = [];

    topics.forEach((topic) => {
      if (topicStates[topic.index]) selected.push(topic.code);
    });

    return selected;
  }

  const buildCountryFilter = () => {
    const selected = [];

    countries.forEach((country) => {
      if (countryStates[country.index]) selected.push(country.code);
    });

    return selected;
  }

  const buildSourceFilter = () => {
    const selected = [];

    if (sources === null || sources === undefined) return selected;

    sources.forEach((source, i) => {
      if (sourceStates[i]) selected.push(source.orig);
    })

    return selected;
  }

  const buildUserFilter = () => {
    const selected = [];
    for (var i = 0 ; i < checkedUsers.length ; ++i) {
      if (checkedUsers[i]) selected.push(i);
    }

    return selected;
  }


  const handleUserChange = (position) => {
    const updatedUserCheked = checkedUsers.map((item, index) =>
      index === position ? !item : item
    );

    setCheckedUsers(updatedUserCheked);
  }

  const handleLanguageChange = (position) => {
    const updatedCheckedState = checkedState.map((item, index) =>
      index === position ? !item : item
    );

    setCheckedState(updatedCheckedState);
  };

  const handleAbuseTypeChange = (position) => {
    const updatedCheckedState = abuseTypesChecked.map((item, index) =>
      index === position ? !item : item
    );

    setAbuseTypesChecked(updatedCheckedState);
  };

  const handleSourceChange = (position) => {

    console.log(position);

    const updatedSourceStates = sourceStates.map((item, index) =>
      index === position ? !item : item
    );

    console.log(updatedSourceStates);

    setSourceStates(updatedSourceStates);
  }

  const handleAccountTypeChange = (position) => {
    const updatedCheckedState = accountTypesChecked.map((item, index) =>
      index === position ? !item : item
    );
      
    setAccountTypesChecked(updatedCheckedState);
  }

  //const platforms = ["Twitter", "YouTube", "Telegram"];

  
  const platforms = useSelector(state => state.dashboard.platforms);  
  const [platformStates, setPlatformStates] = useState(new Array(platforms === null ? 0 : platforms.length).fill(false));

  if (platforms !== null && platformStates.length === 0) {
    setPlatformStates(new Array(platforms.length).fill(false));
  }

  const platformTabs =  platforms?.filter(function(item) {
    // in here we need to remove any platform that doesn't have it's own
    // details tab component
    return item !== "Website"
  })

  const handlePlatformChange = (position) => {
    const updatedState = platformStates.map((item, index) =>
      index === position ? !item : item
    );

    setPlatformStates(updatedState);
  }

  const [abuseFrom, setAbuseFrom] = useState("both");
  const handleAbuseFromChange = (event) => {
    setAbuseFrom(event.target.value);
  };

  const buildPlatformFilter = () => {
    const selected = [];

    platforms.forEach((platform,key) => {
      if (platformStates[key]) selected.push(platform);
    });

    return selected;
  }

  const buildAbuseTypeFilter = () => {
    const selected = [];

    abuseTypes.forEach((abuseType, key) => {
      if (abuseTypesChecked[abuseType.index]) selected.push(abuseType.code);
    })

    return selected;
  }

  const buildAccountTypeFilter = () => {
    const selected = [];

    accountTypes.forEach((accountType, key) => {
      if (accountTypesChecked[accountType.index]) selected.push(accountType.code);
    })

    return selected;
  }

  const filter = useSelector(state => state.dashboard.filter);

  const dateMin = useSelector(state => state.dashboard.minDate);
  const dateMax = useSelector(state => state.dashboard.maxDate);

  const loading = useSelector(state => state.dashboard.loading)
  const done = useSelector(state => state.dashboard.done)
  const failed = useSelector(state => state.dashboard.failed)

  const [expanded, setExpanded] = React.useState(false);

  const [value, setValue] = React.useState('overview');
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const [fType, setFType] = React.useState('accounts');
  const handleFilterTypeChange = (event, newValue) => {
    setFType(newValue);
  }

  if (query == null && (!loading && !done && !failed)) {
    dispatch(getIndexOverview())
  }

  if (user != null) {
    document.title = t("dashboard.heading_with_name", {name: user.name});
  }

  const [fromValue, fromOnChange] = useState(overview?.from);
  const [toValue, toOnChange] = useState(overview?.to)

  if (fromValue == null && overview?.from) {
    fromOnChange(overview.from);
    toOnChange(overview.to);
  }

  const changeFromDate = (value) => {
    if (value === null) value = dateMin;
    fromOnChange(value);
  }

  const changeToDate = (value) => {
    if (value === null) value = dateMax;
    toOnChange(value);
  }

  const setDateRange = (from, to) => {

    if (from === "" || to === "") return;

    fromOnChange(new Date(from));
    toOnChange(new Date(to));

    overview = null;
    setValue('overview');
    dispatch(forgetGraphs());
    dispatch(forgetCoordination());
    dispatch(getIndexOverview(dashboardQuery.current.value, getDashboardFilter(), new Date(from), new Date(to)));
  }

  const dashboardQuery = useRef(query || "");

  const [dashboardFilterAuthors, setDashboardFilterAuthors] = useState(filter?.authors?.join("\n") || "");
  const [dashboardFilterMentions, setDashboardFilterMentions] = useState(filter?.mentions?.join("\n") || "");
  const [dashboardFilterReplyTo, setDashboardFilterReplyTo] = useState(filter?.inReplyTo?.join("\n") || "");
  const [dashboardFilterHashtags, setDashboardFilterHashtags] = useState(() => filter?.hashtags?.join("\n") || "");

  const editTextArea = (value, type) => {
    if(type === "hashtag") setDashboardFilterHashtags(value);
    else if (type === "author") setDashboardFilterAuthors(value);
    else if (type === "mention") setDashboardFilterMentions(value);
    else if (type === "inReplyTo") setDashboardFilterReplyTo(value);
  }

  const addToQuery = (restriction, type) => {

    // make sure the right bit of the filter has been added to the DOM
    // so that the useRef variables are correctly initialised
    var fType = type;
    if (type === "author" || type === "mention" || type === "inReplyTo" || type === "relevantTo")  fType = "accounts";
    if (type === "intersection") fType = "abuse";
    setFType(fType);
    setExpanded(true);

    var regex = new RegExp(restriction + '([\\s\\b]|$)', "gim");

    console.log(regex);

    var filter = dashboardQuery;

    if (type === "language") {
      languages.forEach((lng) => {
        if (lng.code === restriction) checkedState[lng.index] = true;
      })

      setCheckedState(checkedState);
    } else if (type === "platform") {
        platforms.forEach((platform, i) => {
          if (platform === restriction) platformStates[i] = true;
        })

        setPlatformStates(platformStates);
    } else if (type === "topic") {
        topics.forEach((topic) => {
          if (topic.name === restriction) topicStates[topic.index] = true;
        })

        setTopicStates(topicStates);
    } else if (type === "country") {
      countries.forEach((country) => {
        if (country.code === restriction) countryStates[country.index] = true;
      })

      setCountryStates(countryStates);

    } else if (type === "hashtag") {
        setDashboardFilterHashtags(prevValue => {
          if (prevValue.match(regex) === null)
            return (prevValue + "\n" + restriction + "\n").trim();

          return prevValue
        });
    } else if (type === "author") {
      setDashboardFilterAuthors(prevValue => {
        if (prevValue.match(regex) === null)
          return (prevValue+"\n"+restriction+"\n").trim();

        return prevValue
      });
    } else if (type === "mention") {
      setDashboardFilterMentions(prevValue => {
        if (prevValue.match(regex) === null)
          return (prevValue+"\n"+restriction+"\n").trim();

        return prevValue
      });
    } else if (type === "inReplyTo") {
      setDashboardFilterReplyTo(prevValue => {
        if (prevValue.match(regex) === null)
          return (prevValue+"\n"+restriction+"\n").trim();

        return prevValue;
      });
    } else if (type === "intersection") {
      setAbuseTypeMode("all");

      var updated = new Array(abuseTypes.length).fill(false)

      updated[abuseTypes.indexOf(restriction[0])] = true;
      updated[abuseTypes.indexOf(restriction[1])] = true;

      setAbuseTypesChecked(updated);

    } else if (type === "sources") {
      for (var i = 0 ; i < sources.length ; ++i) {
        if (sources[i].orig === restriction) sourceStates[i] = true;
      }

      setSourceStates(sourceStates);

    } else if (type === "relevantTo") {
      
      for (var j = 0 ; j < userList.length ; ++j) {
        if (userList[j].handle === restriction[0] && userList[j].platform === restriction[1]) {
          checkedUsers[userList[j].index] = true;
        } 
      }

      setCheckedUsers(checkedUsers);

    } else {

      if (filter.current.value.match(regex) === null)
        filter.current.value = (filter.current.value + (filter === dashboardQuery ? " " : "\n") + restriction).trim();

    }

    

    setToastMessage(t("dashboard.filter.addTo", {item: type}));
    setOpenToast(true);
  };

  const getDashboardFilter = () => {
    return {
      authors: split(dashboardFilterAuthors, true),
      mentions: split(dashboardFilterMentions),
      inReplyTo: split(dashboardFilterReplyTo, true),
      languages: buildLangFilter(),//split(dashboardFilterLanguages.current.value),
      users: buildUserFilter(),

      //TODO should force lowercase and that each starts with a #
      hashtags: split(dashboardFilterHashtags).map((element, index) => {
        return element[0] === "#" ? element : "#" + element;
      }),

      platforms: buildPlatformFilter(),
      abuseTypes: {
        terms: buildAbuseTypeFilter(),
        mode: abuseTypeMode
      },
      accountTypes: buildAccountTypeFilter(),
      abuseFrom: abuseFrom,
      topics: buildTopicFilter(),
      countries: buildCountryFilter(),
      sources: buildSourceFilter()
    }
  }

  const update = () => {
    overview = null;
    setValue('overview');
    setExpanded(false);
    dispatch(forgetGraphs());
    dispatch(forgetCoordination());
    dispatch(getIndexOverview(dashboardQuery.current.value, getDashboardFilter(), fromValue, toValue));
    setLocation()
  }

  const split = (input, keepCase) => {

    if (input === null || input === undefined || input.trim() === "") return [];

    input = input.trim();

    if (keepCase) return input.split(/\s+/);

    return input.toLowerCase().split(/\s+/);
  }

  const reset = () => {
    overview = null;
    setValue('overview');
    setAbuseFrom("both");
    setCheckedState(new Array(0).fill(false));
    setPlatformStates(new Array(0).fill(false));
    setCheckedUsers(new Array(0).fill(false));
    setAbuseTypesChecked(new Array(0).fill(false));
    setAccountTypesChecked(new Array(0).fill(false));
    setAbuseTypeMode("any");
    setTopicStates(new Array(0).fill(false));
    setCountryStates(new Array(0).fill(false));
    setSourceStates(new Array(0).fill(false));
    setDashboardFilterAuthors("");
    setDashboardFilterHashtags("");
    setDashboardFilterMentions("");
    setDashboardFilterReplyTo("");
    setExpanded(false);
    fromOnChange(dateMin);
    toOnChange(dateMax);
    dispatch(forgetGraphs());
    dispatch(forgetCoordination())
    dispatch(getIndexOverview());
    // for some reason, does not auto update on switch to null
    // even if we add deps to the useEffect. force used instead.
    setLocation()
  }

  const setLocation = () => {
    axios.get("./locate?path=" + encodeURIComponent(window.location.pathname))
      .then((response) => {

        // we only really need the first name for each user, so to avoid changing
        // the rest of the UI, set the name value to just the first name in the list
        var data = response.data;
        data.users.forEach(user => {
          user.name = user.name[0]
        })

        dispatch(setAppLocation(data))
      })
      .catch((error) => {
        console.log(error);
      });
  }

  const [openToast, setOpenToast] = React.useState(false);
  const [openSettings, setOpenSettings] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState("");

  const accordian = () => {
    setExpanded(!expanded);
  }

  const handleOpenSettings = (e) => {
    //e.preventDefault();
    setOpenSettings(true);
  }

  const handleCloseSettings = () => {
    setOpenSettings(false);
  }

  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenToast(false);
  }

  useEffect(() => {
    if (location === null) {
      setLocation()
    }
  });

  const [reportItems, setReportItems] = useState([]);

  const addToReport = (itemType, data) => {
    
    reportItems.push({
      type: itemType,
      data: data,
      filter: {
        ...getDashboardFilter(), 
        query: dashboardQuery.current.value,
        from: fromValue,
        to: toValue
      },
      images: []
    })

    setReportItems(reportItems);

    setToastMessage(t("components.pdfReport.addTo"));
    setOpenToast(true);
  }
  
  return (
    (<React.Fragment>
      {loading && <LinearProgress />}
      {done && failed ? <Alert 
        severity="error"
        action={
          <Button style={{float: "right"}} data-cy="btnREtry" color="inherit" size="small" onClick={() => {reset()}}>{t("dashboard.retry")}</Button>
        }>{t("dashboard.error")}</Alert> : null}
      {done && !failed ?
        <React.Fragment>
          <Grid
            container
            p={0}
            direction="row"
            spacing={3}
            alignItems="flex-start">

            <Grid item xs={6} data-cy="dashboardDateRange">
              <Typography variant="body1">
                {t("dashboard.description", {name: user.name})}
              </Typography>
              <Typography component="div" variant="body1">{t("dashboard.date_range", {dateMin: dateMin, dateMax: dateMax, timezone: overview.timezone})}</Typography>
              <Box m={3} />

              <Paper style={{ padding: 10, marginTop: 10, marginBottom: 5}}>
                <Typography style={{fontStyle:"italic"}} variant="body1">
                  <Trans i18nKey="dashboard.safety"
                    values={{name:location.helpResourcesName}}
                    components={{
                      1: <Link href={location.helpResourcesURL} target="_blank" underline="hover" />
                    }}/>
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} data-cy="dashboardUser">
              {overview?.users?.length === 1 && <User screen_name={overview.users[0].handle} image={overview.dashboard_img} addToQuery={addToQuery} />}
              {overview?.users?.length > 1 && <UserGroup image={overview.dashboard_img} description={overview.dashboard_desc} title={overview.title} users={overview.users} />}
            </Grid>

            <Grid item xs={12}>
              <Button variant="contained" color="primary" onClick={() => handleOpenSettings()} style={{float:"right"}} data-cy="btnSettings"><SettingsIcon /> {t("dashboard.settings.title")}</Button>
            </Grid>
          </Grid>

          <Box m={3}/>

            <Grid component={Paper}
              container
              p={3}
              direction="row"
              alignItems="center"
              data-cy="dashboardFilters">

              <Grid item xs data-cy="dashboardQuery">
                <TextField
                  id="dashboardQuery"
                  inputRef={dashboardQuery}
                  defaultValue={query || ""}
                  fullWidth
                  variant="outlined"
                  onKeyPress={e => {
                    if (e.key === 'Enter') {
                      update();
                    }
                  }}
                />
              </Grid>

              <Grid item data-cy="dashboardDatePicker" p={2}>
                <DatePicker value={fromValue} onChange={changeFromDate} minDate={dateMin} maxDate={dateMax} /> {t("dashboard.to")} <DatePicker value={toValue} onChange={changeToDate} minDate={dateMin} maxDate={dateMax} />
              </Grid>

              <Grid item data-cy="dashboardUpdate">
                <Button data-cy="btnUpdate" variant="contained" color="primary" onClick={() => update()}>{t("dashboard.update")}</Button> <Button variant="contained" color="secondary" onClick={() => reset()}>{t("dashboard.reset")}</Button>
              </Grid>

              <Grid item xs={12}>
                <Accordion elevation={0} expanded={expanded}>
                  <AccordionSummary expandIcon={<ExpandIcon onClick={accordian} style={{ fontSize: "150%" }} />}>
                    {!expanded && <span>{t("dashboard.filter.collapsed")}</span>}
                  </AccordionSummary>
                  <AccordionDetails>

                    <TabContext value={fType} >
                      <Box
                        sx={{ display: "flex" }}
                      >
                        <Tabs value={fType}
                          onChange={handleFilterTypeChange}
                          orientation="vertical" style={{ minWidth: 120 }}>
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.accounts")} value="accounts" />
                          {platforms.length > 1 && <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.platforms")} value="platform" />}
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.hashtags")} value="hashtag" />
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.languages")} value="language" />
                          {countries.length > 0 && <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.countries")} value="country" />}
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.topics")} value="topic" />
                          <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.abuse")} value="abuse" />
                          {sources != null && sources.length > 0 && <Tab style={{ minWidth: 120 }} label={t("dashboard.filter.tabs.sources")} value="sources" />}
                        </Tabs>

                        <TabPanel value="accounts">
                          <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >

                            {location?.users?.length > 1 && <Grid item xs={3}>
                              {t("dashboard.filter.relevantTo")}
                              <List style={{ height: "15em", overflow: "auto", marginTop: 15, border: "1px solid #767676", padding: "2px" }}>
                                {userList.map(function (u,i) {
                                  return (
                                    <FormControlLabelStacked key={i} label={<span>{u.name} {u.handle != null && "("+u.handle+")"} {getPlatformIcon(u.platform, { fontSize: "90%", color: "silver" })}</span>}
                                      control={<Checkbox value={u.index}
                                        checked={checkedUsers[u.index]}
                                        onChange={() => handleUserChange(u.index)} />} />
                                  )
                                })}
                              </List>
                            </Grid>}

                            <Grid item xs={3}>
                              {t("dashboard.filter.authors")}
                              <TextareaAutosize
                                onChange={(event) => editTextArea(event.target.value,"author")}
                                value={dashboardFilterAuthors}
                                minRows={15}
                                style={{ marginTop: 15, width: "100%" }}
                              />
                            </Grid>

                            <Grid item xs={3}>
                              {t("dashboard.filter.mentions")}
                              <TextareaAutosize
                                onChange={(event) => editTextArea(event.target.value,"mention")}
                                value={dashboardFilterMentions}
                                minRows={15}
                                style={{ marginTop: 15, width: "100%" }}
                              />
                            </Grid>

                            <Grid item xs={3}>
                            {t("dashboard.filter.inReplyTo")}
                              <TextareaAutosize
                                onChange={(event) => editTextArea(event.target.value,"inReplyTo")}
                                value={dashboardFilterReplyTo}
                                minRows={15}
                                style={{ marginTop: 15, width: "100%" }}
                              />
                            </Grid>

                            {platforms.includes("Twitter") && <Grid item xs={12}>
                              {t("dashboard.filter.associated.label")}
                              <List style={{ marginLeft: "1em", marginTop: 15, display: "inline" }}>
                                {accountTypes.map(function(u,i) {
                                  return (
                                    <FormControlLabel key={i} label={u.name} control={<Checkbox value={u.index}
                                      checked={accountTypesChecked[u.index]}
                                      onChange={() => handleAccountTypeChange(u.index)}/>} />
                                  )
                                })}
                              </List>
                            </Grid>}

                          </Grid>
                        </TabPanel>

                        <TabPanel value="hashtag">
                          <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >
                            <Grid item >
                              {t("dashboard.filter.hashtags")}
                              <TextareaAutosize
                                onChange={(event) => editTextArea(event.target.value,"hashtag")}
                                value={dashboardFilterHashtags}
                                minRows={15}
                                style={{ marginTop: 15, width: "100%" }}
                              />
                            </Grid>
                          </Grid>
                        </TabPanel>

                        <TabPanel value="language">
                          <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >
                            <Grid item xs={12}>
                              {t("dashboard.filter.languages")}
                              <List style={{  marginTop: 5 }}>
                                {languages.map(function (i, key) {
                                  return (
                                    <FormControlLabel key={key} label={i.name}
                                      control={<Checkbox value={i.code}
                                        checked={checkedState[i.index]}
                                        onChange={() => handleLanguageChange(i.index)} />} />
                                  )
                                })}
                              </List>
                            </Grid>
                          </Grid>
                        </TabPanel>

                        <TabPanel value="country">
                          <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >
                            <Grid item xs={12}>
                              {t("dashboard.filter.countries")}
                              <Typography variant={"body2"}>{t("dashboard.filter.countries_info")}</Typography>
                              <List style={{  marginTop: 15 }}>
                                {countries.map(function (i, key) {
                                  return (
                                    <FormControlLabel key={key} label={i.name}
                                      control={<Checkbox value={i.code}
                                        checked={countryStates[i.index]}
                                        onChange={() => handleCountryChange(i.index)} />} />
                                  )
                                })}
                              </List>
                            </Grid>
                          </Grid>
                        </TabPanel>

                        <TabPanel value="platform">
                          <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >
                            <Grid item xs={12}>
                              {t("dashboard.filter.platforms")}
                              <List style={{ marginTop: 15, padding: "2px" }}>
                                {platforms.map(function (i, key) {
                                  return (
                                    <FormControlLabel label={i} key={key}
                                      control={<Checkbox
                                        checked={platformStates[key]}
                                        onChange={() => handlePlatformChange(key)} />} />
                                  )
                                })}
                              </List>
                            </Grid>
                          </Grid>
                        </TabPanel>

                        <TabPanel value="topic">
                          <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >
                            <Grid item xs={12}>
                              {t("dashboard.filter.topics")}
                              <List style={{ marginTop: 15, padding: "2px" }}>
                                {topics.map(function (i, key) {
                                  return (
                                    <FormControlLabel key={key} label={i.name}
                                      control={<Checkbox
                                        value={i.code}
                                        checked={topicStates[i.index]}
                                        onChange={() => handleTopicChange(i.index)} />} />
                                  )
                                })}
                              </List>
                            </Grid>
                          </Grid>
                        </TabPanel>

                        <TabPanel value="abuse">
                          <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >
                            
                            {location?.translations && <Grid item xs={12}>
                        {t("dashboard.filter.abuse.show")}&nbsp;
                        <List style={{ height: "1.5em", display:"inline" }}>
                          <FormControlLabel onChange={handleAbuseFromChange} checked={abuseFrom === "original"} label={t("dashboard.filter.abuse.original")} control={<Radio name="translations" value="original"/>}/>
                          <FormControlLabel onChange={handleAbuseFromChange} checked={abuseFrom === "translation"} label={t("dashboard.filter.abuse.translated")} control={<Radio name="translations" value="translation"/>}/>
                          <FormControlLabel onChange={handleAbuseFromChange} checked={abuseFrom === "both"} label={t("dashboard.filter.abuse.both")} control={<Radio name="translations" value="both"/>}/>
                        </List>
                        </Grid>}

                        <Grid item xs={12} style={{paddingBottom:0}}>
                        {t("dashboard.filter.abuse.containing")} <Select
                          variant="standard"
                          id="abuseTypeMode"
                          value={abuseTypeMode}
                          label="Mode"
                          onChange={(event) => {
                              setAbuseTypeMode(event.target.value)
                          }}>
                            <MenuItem value={"any"}>{t("dashboard.filter.abuse.any")}</MenuItem>
                            <MenuItem value={"all"}>{t("dashboard.filter.abuse.all")}</MenuItem>
                        </Select> {t("dashboard.filter.abuse.types")}:
                        <List style={{ marginTop: 15, padding: "2px" }}>
                                {abuseTypes.map(function (i, key) {
                                  return (
                                    <FormControlLabel label={i.name} key={key}
                                      control={<Checkbox
                                        checked={abuseTypesChecked[i.index]}
                                        onChange={() => handleAbuseTypeChange(i.index)} />} />
                                  )
                                })}
                              </List>

                      
                      </Grid>
                            
                          </Grid>
                        </TabPanel>

                        <TabPanel value="sources">
                        <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start"
                            data-cy="dashboardFilters"
                          >
                            <Grid item xs={12}>
                              {t("dashboard.filter.sources")}
                              <List style={{ marginTop: 15, padding: "2px" }}>
                                {sources?.map(function (source, i) {
                                  return (
                                    <FormControlLabel label={source.text} key={i}
                                      control={<Checkbox
                                        value={source.orig}
                                        checked={sourceStates[i]}
                                        onChange={() => handleSourceChange(i)} />} />
                                  )
                                })}
                              </List>
                            </Grid>
                          </Grid>
                        </TabPanel>

                      </Box>
                    </TabContext>

                  </AccordionDetails>
                </Accordion>
              </Grid>
            </Grid>

          <Box sx={{ width: '100%', typography: 'body1'}} data-cy="dashboardCurrentTab" >
            <TabContext value={value} >
              <Box sx={{ borderBottom: 1, borderColor: 'silver' }} data-cy="dashboardTabs">
                <Tabs onChange={handleChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  value={value}>
                  
                  {location?.live && <Tab style={{minWidth:110, maxWidth:130}} icon={alerts?.status?.triggered ? <WarningOutlined className={"blink"} style={{color:"red"}}/> : null} label={t("dashboard.alerts.tab")} value="alerts" />}

                  <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.dataset_overview.title")} value="overview" />
                  {location?.users?.length > 1 && <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.summary.tab")} value="summary" />}
                  
                  {platformTabs.length > 1 && <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.platform_specific.tab")} value="platforms" />}
                  {platformTabs.length === 1 && platforms.includes("Twitter") && <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.twitter.tab")} value="twitter" />}
                  {platformTabs.length === 1 && platforms.includes("YouTube") && <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.youtube.tab")} value="youtube" />}
                  {platformTabs.length === 1 && platforms.includes("Facebook") && <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.facebook.tab")} value="facebook" />}
                  {platformTabs.length === 1 && platforms.includes("Mastodon") && <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.mastodon.tab")} value="mastodon" />}
                  {platformTabs.length === 1 && platforms.includes("TikTok") && <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.tiktok.tab")} value="tiktok" />}
                  
                  <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.abuse_overview.title")} value="abuse" />
                  <Tab style={{minWidth:120, maxWidth:130}} label={t("dashboard.abuse_triggers.title")} value="triggers" />

                  <Tab style={{minWidth:100, maxWidth:130}} label={t("dashboard.conversation.title")} value="conversation" />
                  <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.userSearch.title")} value="userSearch" />
                  <Tab style={{minWidth:110, maxWidth:130}} label={t("dashboard.reports.title")} value="reports" />
                </Tabs>
              </Box>
              <TabPanel value="overview"><IndexOverview addToQuery={addToQuery} addToReport={addToReport} tabs={setValue} query={query} filter={filter} filterID={overview.filter} from={overview.from} to={overview.to} setDateRange={setDateRange} /></TabPanel>
              <TabPanel value="abuse"><AbusiveOverview addToQuery={addToQuery} addToReport={addToReport} tabs={setValue} query={query} filter={filter} filterID={overview.filter} from={overview.from} to={overview.to} setDateRange={setDateRange} /></TabPanel>
              <TabPanel value="summary"><AccountsSummary tabs={setValue} addToReport={addToReport} addToQuery={addToQuery} /></TabPanel>
              <TabPanel value="alerts"><Alerts addToQuery={addToQuery} tabs={setValue} addToReport={addToReport} filterID={overview.filter} /></TabPanel>
              <TabPanel value="triggers"><AbusiveTriggers addToReport={addToReport} tabs={setValue} query={query} filter={filter} filterID={overview.filter} from={overview.from} to={overview.to} addToQuery={addToQuery} /></TabPanel>
              <TabPanel value="conversation"><Conversation addToReport={addToReport} addToQuery={addToQuery} tabs={setValue}/></TabPanel>
              <TabPanel value="userSearch"><UserSearch addToQuery={addToQuery} tabs={setValue} /></TabPanel>
              <TabPanel value="twitter"><TwitterDetails addToQuery={addToQuery} tabs={setValue} addToReport={addToReport} query={query} filter={filter} setDateRange={setDateRange}/></TabPanel>
              <TabPanel value="tiktok"><TikTokDetails addToQuery={addToQuery} tabs={setValue} addToReport={addToReport} query={query} filter={filter} setDateRange={setDateRange}/></TabPanel>
              <TabPanel value="youtube"><YouTubeDetails addToQuery={addToQuery} tabs={setValue} addToReport={addToReport} setDateRange={setDateRange}/></TabPanel>
              <TabPanel value="facebook"><FacebookDetails addToQuery={addToQuery} tabs={setValue} addToReport={addToReport} setDateRange={setDateRange}/></TabPanel>
              <TabPanel value="mastodon"><MastodonDetails addToQuery={addToQuery} tabs={setValue} addToReport={addToReport} setDateRange={setDateRange}/></TabPanel>
              <TabPanel value="reports"><Reports items={reportItems} setItems={setReportItems} addToReport={addToReport}/></TabPanel>
              <TabPanel value="platforms"><PlatformSpecific tabs={setValue} query={query} filter={filter} addToQuery={addToQuery} setDateRange={setDateRange} addToReport={addToReport}/></TabPanel>
            </TabContext>
          </Box>

          <Dialog
            open={openSettings}
            onClose={handleCloseSettings}
            maxWidth="md">
            <DialogContent>
              <Settings />
            </DialogContent>
          </Dialog>

          <Snackbar open={openToast} autoHideDuration={3000} onClose={handleCloseToast} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
            <Alert onClose={handleCloseToast} severity="success" sx={{ width: '100%' }}>
              {toastMessage}
            </Alert>
          </Snackbar>
        </React.Fragment> : null}
    </React.Fragment>)
  );
};

export default Dashboard;
