import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes
} from "react-router-dom";

import axios from "axios";

import Frontpage from "./Frontpage";
import Dashboard from "./Dashboard";

import { Box, ThemeProvider } from "@mui/material";
import { Theme as theme } from "./branding/Theme"

import { ReactComponent as UoSLogo } from "./images/UoS_Crest.svg"

import Container from '@mui/material/Container';
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { useTranslation, Trans } from 'react-i18next';
import CustomizedSnackbar from "./components/CustomizedSnackbar";

import Cookies from "js-cookie";

import Plotly from 'plotly.js-dist-min'
import locale_hi from 'plotly.js-locales/hi-in'

import OtherIcon from "@mui/icons-material/QuestionAnswer";

Plotly.register(locale_hi)

export default function App() {

  const { t, i18n } = useTranslation();

  Plotly.setPlotConfig({locale: i18n.language})

  const [language, setLanguage] = useState(Cookies.get("i18next") || "en");

  const [location, setLocation] = useState(null);

  
  i18n.on('languageChanged', () => {
    setLanguage(i18n.language);
  })

  const handleChangeLocale = (e) => {
    const lang = e.target.value;
    i18n.changeLanguage(lang);
  };

  useEffect(() => {

    const currentLangObj = location?.languages ? location.languages[language] : {};
    
    document.body.dir = currentLangObj?.dir || 'ltr'

    if (location == null) {

      axios.get("./locate?path=" + encodeURIComponent(window.location.pathname))
        .then((response) => {
          setLocation(response.data);
        })
        .catch((error) => {
          console.log(error);
          setLocation(error);
        });
    }
  }, [location, language]);

  if (location == null) return (null);

  return (
    <ThemeProvider theme={theme}>
          {true && <Container>
            <Typography style={{ float: "right", paddingBottom:"1em" }} variant={"body2"}>
              <select onChange={handleChangeLocale} value={language}>
                {Object.keys(location.languages).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </Typography>
          </Container>}
          <Box my={4} />
          <Container>
            <Grid container alignItems={"center"} alignContent={"center"}>
              <OtherIcon style={{ fill: "#4e954b", stroke: "#4e954b", height:"2em", width: "2em", paddingRight:"0.5em"}} />
              {/*<ConversationIcon style={{ fill: "#4e954b", stroke: "#4e954b" }} />*/}
              <Typography variant="h4" color={'primary'} style={{ flex: 1 }}>
                {t('frontpage.heading')}
              </Typography>

              <Link
                href="https://gate-socmedia.group.shef.ac.uk/"
                target="_blank"
                underline="hover"><UoSLogo
                style={{ paddingRight: 40 }} /></Link>

              {location.partner.url && location.partner.img ?
                <Link href={location.partner.url} target="_blank" underline="hover"><img
                  onError={({ currentTarget }) => {
                    // if the partner image is 404 then  remove the link rather than leaving
                    // a broken image showing right in the header
                    currentTarget.parentElement.remove();
                  }} src={location.partner.img} style={{ paddingRight: 20 }} alt=""/></Link>
                : null}
            </Grid>

            <Box my={4} />

            <Router>
              <Routes>
                <Route exact path={location.prefix + "/:handle/"} element={<Dashboard />} />
                <Route exact path={location.prefix + "/"} element={<Frontpage />} />
              </Routes>
            </Router>

          </Container>
          <div><CustomizedSnackbar /></div>
          <div style={{padding: theme.spacing(10, 5), textAlign: "center", bottom: 0, opacity: 0.4}}>
            <Typography variant={"body2"}>
              <Trans i18nKey="footer">Developed by <Link
                href='https://gate-socmedia.group.shef.ac.uk/'
                target='_blank'
                underline="hover">The University of Sheffield</Link></Trans>
            </Typography>
          </div>
        </ThemeProvider>
          
  );
}