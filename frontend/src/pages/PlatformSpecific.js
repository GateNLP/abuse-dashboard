import React, { useState } from "react";
import { useSelector } from "react-redux";


import { withTranslation } from "react-i18next";

import { Box, Tab, Tabs } from "@mui/material";
import { TabContext, TabPanel } from "@mui/lab";

import { getPlatformIcon } from "../api";
import TwitterDetails from "./TwitterDetails";
import YouTubeDetails from "./YouTubeDetails";
import FacebookDetails from "./FacebookDetails";
import MastodonDetails from "./MastodonDetails";
import TikTokDetails from "./TikTokDetails";

const PlatformSpecific = (props) => {

    //eslint-disable-next-line
    const { t, i18n, addToQuery, tabs, addToReport, query, filter, setDateRange } = props;

    const platforms = useSelector(state => state.dashboard.platforms);

    const [tab, setTab] = useState(platforms.indexOf("Twitter") != -1 ? "Twitter" : platforms[0]);
    const handleTabChange = (event, newValue) => {
        setTab(newValue);
    };

    return (
        <TabContext value={tab}>
            <Box
                sx={{ bgcolor: 'background.paper', display: 'flex' }}
            >
                <Tabs
                    orientation="vertical"
                    variant="scrollable"
                    value={tab}
                    onChange={handleTabChange}
                    aria-label="Vertical tabs example"
                    style={{ minWidth: 150 }}
                    sx={{ borderRight: 1, borderColor: 'divider' }}
                >
                    {platforms.includes("Facebook") && <Tab iconPosition="top" icon={getPlatformIcon("Facebook")} label={t("dashboard.facebook.tab")} value="Facebook" />}
                    {platforms.includes("Mastodon") && <Tab iconPosition="top" icon={getPlatformIcon("Mastodon")} label={t("dashboard.mastodon.tab")} value="Mastodon" />}
                    {platforms.includes("TikTok") && <Tab iconPosition="top" icon={getPlatformIcon("TTikTok")} label={t("dashboard.tiktok.tab")} value="TikTok" />}
                    {platforms.includes("Twitter") && <Tab iconPosition="top" icon={getPlatformIcon("Twitter")} label={t("dashboard.twitter.tab")} value="Twitter" />}
                    {platforms.includes("YouTube") && <Tab iconPosition="top" icon={getPlatformIcon("YouTube")} label={t("dashboard.youtube.tab")} value="YouTube" />}
                    

                </Tabs>
                <TabPanel value="Twitter"><TwitterDetails addToQuery={addToQuery} tabs={tabs} addToReport={addToReport} query={query} filter={filter} setDateRange={setDateRange} /></TabPanel>
                <TabPanel value="TikTok"><TikTokDetails addToQuery={addToQuery} tabs={tabs} addToReport={addToReport} query={query} filter={filter}  setDateRange={setDateRange}/></TabPanel>
                <TabPanel value="YouTube"><YouTubeDetails addToQuery={addToQuery} tabs={tabs} addToReport={addToReport} query={query} filter={filter}  setDateRange={setDateRange}/></TabPanel>
                <TabPanel value="Mastodon"><MastodonDetails addToQuery={addToQuery} tabs={tabs} addToReport={addToReport}  setDateRange={setDateRange}/></TabPanel>
                <TabPanel value="Facebook"><FacebookDetails addToQuery={addToQuery} tabs={tabs} addToReport={addToReport} query={query} filter={filter}  setDateRange={setDateRange}/></TabPanel>
            </Box>
        </TabContext>


    )
}

export default withTranslation()(PlatformSpecific);
