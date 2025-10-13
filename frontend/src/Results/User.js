import React, { Component } from "react";
import { connect } from 'react-redux';

import axios from "axios";

import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";

import { TabContext, TabList, TabPanel } from "@mui/lab";
import Typography from "@mui/material/Typography";
import Paper from '@mui/material/Paper';

import { Box, Divider, Tab } from "@mui/material";

import ConversationAPI from "../api"

import { withTranslation, Trans } from 'react-i18next';

import { anonymize } from "../api";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import CircularProgress from "@mui/material/CircularProgress";
import {withLinks} from "../linkify";

import UserMenu from "../components/buttons/UserMenu";

const endpoint = ".";//process.env.REACT_APP_CONVERSATION_API

const conversationApi = ConversationAPI()

class User extends Component {

    constructor(props) {
        super(props);

        // set default values for the state
        this.state = {
            // TODO is there anything we need to default to?
        }
    }

    
    handleChange = (event, newValue) => {
        this.setState({...this.state, tab: newValue});
    };

    fixImage(img) {

        if (img === undefined || img === null) return;

        if (this.state.platform !== "Twitter") {
            this.setState({
                img: img
              });

            return;
        }

        img = img.substring(img.indexOf(":")+1);

        fetch(img, { method: 'HEAD'})
          .then((response) => {
            if (response.ok && response.url.indexOf("static/deleted") === -1) {
              this.setState({
                img: img
              })
            }
          },
          (error) => {
            // for now just log the error to the console
            console.log(error);
          })  
      }

    getUserDetails() {
        this.setState({loading: true});
        axios.get(
            endpoint + "/user?screen_name=" + this.props.screen_name + (this.props.date ? "&date="+this.props.date : "")
        )
            .then((response) => {

                // if we didn't hit an error then set the state with the relevant data
                this.setState({
                    name: response.data.name,
                    screen_name: response.data.screen_name,
                    img: "../default_profile_normal.png",
                    description: withLinks(response.data.description, response.data.platform, this.props.addToQuery),
                    url: response.data.url,
                    following: conversationApi.formatLargeNumber(response.data.friends_count),
                    followers: conversationApi.formatLargeNumber(response.data.followers_count),
                    tweets: conversationApi.formatLargeNumber(response.data.statuses_count),
                    lists: conversationApi.formatLargeNumber(response.data.listed_count),
                    created_at: response.data.created_at,
                    account_age: response.data.account_age?.toLocaleString(),
                    tweets_per_day: response.data.tweets_per_day?.toFixed(2),
                    verified: response.data.verified || response.data.is_blue_verified,
                    protected: response.data.protected,
                    location: response.data.location,
                    status: response.data.account_status,
                    error: response.data.error,
                    tweet_date: response.data.tweet_date,
                    bios: response.data.bios,
                    anonymousMode: this.props.anonymousMode,
                    addToQuery: this.props.addToQuery,
                    platform: response.data.platform,
                    verified_type: response.data.verified_type,
                    affiliated_with: response.data.affiliated_with,
                    tab: "0",
                    loading: false,
                })

                this.fixImage(response.data.profile_image_url_https?.replace("_normal", ""))
            }, (error) => {
                // for now just log the error to the console
                console.log(error);

                // just return an unknown user label; this should be impossible so...
                this.setState({
                    name: "unknown user",
                    loading: false,
                })
            });
    }

    componentDidUpdate(prevProps) {
        if (prevProps.screen_name !== this.props.screen_name) {
            this.getUserDetails()
        }
    }

    componentDidMount() {

        if (this.props.user) {
            this.setState({
                name: this.props.user.name,
                screen_name: this.props.user.screen_name,
                img: "../default_profile_normal.png",
                description: withLinks(this.props.user.description, this.props.user.platform, this.props.addToQuery),
                url: this.props.user.url,
                following: conversationApi.formatLargeNumber(this.props.user.friends_count),
                followers: conversationApi.formatLargeNumber(this.props.user.followers_count),
                tweets: conversationApi.formatLargeNumber(this.props.user.statuses_count),
                lists: conversationApi.formatLargeNumber(this.props.user.listed_count),
                created_at: this.props.user.created_at,
                account_age: this.props.user.account_age.toLocaleString(),
                tweets_per_day: this.props.user.tweets_per_day.toFixed(2),
                verified: this.props.user.verified || this.props.user.is_blue_verified,
                protected: this.props.user.protected,
                location: this.props.user.location,
                status: this.props.user.account_status,
                tweet_date: this.props.user.tweet_date,
                bios: this.props.user.bios,
                anonymousMode: this.props.anonymousMode,
                addToQuery: this.props.addToQuery,
                platform: this.props.user.platform,
                verified_type: this.props.user.verified_type,
                affiliated_with: this.props.user.affiliated_with,
                tab: "0",
                loading: false,
            })

            this.fixImage(this.props.user.profile_image_url_https?.replace("_normal", ""));
        } else {
            this.getUserDetails()
        }
    }

    anonym(str) {
        return anonymize(str, this.state.anonymousMode);
    }

    bios(t) {
        return (
            (<React.Fragment>
                <Typography variant="body1"><Trans i18nKey="dashboard.user.bio.title" values={{name:this.anonym(this.state.name), screenName:this.anonym(this.state.screen_name)}}>ignore this <Link
                    data-cy="user.screenName"
                    href={"https://twitter.com/" + this.state.screen_name}
                    target="_blank"
                    underline="hover">@</Link></Trans></Typography>
                <TableContainer component={Paper} style={{ maxHeight: 550 }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>{t("dashboard.user.bio.tweets")}</TableCell>
                                <TableCell>{t("dashboard.user.bio.earliest")}</TableCell>
                                <TableCell>{t("dashboard.user.bio.latest")}</TableCell>
                                <TableCell>{t("dashboard.user.bio.bio")}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {this.state.bios.map((bio, bk) => (
                                <TableRow key={bk}>
                                    <TableCell>{bio.count}</TableCell>
                                    <TableCell>{bio.earliest}</TableCell>
                                    <TableCell>{bio.latest}</TableCell>
                                    <TableCell>{withLinks(bio.description, this.state.platform, this.state.addToQuery)}</TableCell>
                                </TableRow>))}

                        </TableBody>

                    </Table>
                </TableContainer>
            </React.Fragment>)
        );
    }

    summary(t) {

        return (
            (<Paper key={this.props.screen_name} style={{ padding: 10, marginTop: 10, marginBottom: 5, textAlign: "center" }}>
                <Grid
                    data-cy="userInformation"
                    container
                    spacing={0}
                    direction="column"
                    alignItems="center"
                    justifyContent="center">

                    <Grid item xs={5}>
                        <img style={{ borderRadius: "50%", maxWidth: "300px", border:`3px solid ${this.props.colors[this.state.platform]}` }} width="100%" src={this.anonym(this.state.img)} alt="" />
                    </Grid>

                    <Grid item xs={11}>
                        <Typography data-cy="user.displayName" variant="h4">
                            {this.anonym(this.state.name)}
                            {this.state.verified ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" style={{ fill: "#1da1f2", fillOpacity: 1 }} /></g></svg> : null}
                            {this.state.verified_type === "Government" ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 22 22" aria-label="Verified account" role="img" data-testid="icon-verified"><g><path clip-rule="evenodd" d="M12.05 2.056c-.568-.608-1.532-.608-2.1 0l-1.393 1.49c-.284.303-.685.47-1.1.455L5.42 3.932c-.832-.028-1.514.654-1.486 1.486l.069 2.039c.014.415-.152.816-.456 1.1l-1.49 1.392c-.608.568-.608 1.533 0 2.101l1.49 1.393c.304.284.47.684.456 1.1l-.07 2.038c-.027.832.655 1.514 1.487 1.486l2.038-.069c.415-.014.816.152 1.1.455l1.392 1.49c.569.609 1.533.609 2.102 0l1.393-1.49c.283-.303.684-.47 1.099-.455l2.038.069c.832.028 1.515-.654 1.486-1.486L18 14.542c-.015-.415.152-.815.455-1.099l1.49-1.393c.608-.568.608-1.533 0-2.101l-1.49-1.393c-.303-.283-.47-.684-.455-1.1l.068-2.038c.029-.832-.654-1.514-1.486-1.486l-2.038.07c-.415.013-.816-.153-1.1-.456zm-5.817 9.367l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="#829aab" fillRule="evenodd"></path></g></svg> : null}
                            {this.state.verified_type === "Business" ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 22 22" aria-label="Verified account" role="img" data-testid="icon-verified"><g><linearGradient gradientUnits="userSpaceOnUse" id="43-a" x1="4.411" x2="18.083" y1="2.495" y2="21.508"><stop offset="0" stopColor="#f4e72a"></stop><stop offset=".539" stopColor="#cd8105"></stop><stop offset=".68" stopColor="#cb7b00"></stop><stop offset="1" stopColor="#f4ec26"></stop><stop offset="1" stopColor="#f4e72a"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="43-b" x1="5.355" x2="16.361" y1="3.395" y2="19.133"><stop offset="0" stopColor="#f9e87f"></stop><stop offset=".406" stopColor="#e2b719"></stop><stop offset=".989" stopColor="#e2b719"></stop></linearGradient><g clipRule="evenodd" fillRule="evenodd"><path d="M13.324 3.848L11 1.6 8.676 3.848l-3.201-.453-.559 3.184L2.06 8.095 3.48 11l-1.42 2.904 2.856 1.516.559 3.184 3.201-.452L11 20.4l2.324-2.248 3.201.452.559-3.184 2.856-1.516L18.52 11l1.42-2.905-2.856-1.516-.559-3.184zm-7.09 7.575l3.428 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#43-a)"></path><path d="M13.101 4.533L11 2.5 8.899 4.533l-2.895-.41-.505 2.88-2.583 1.37L4.2 11l-1.284 2.627 2.583 1.37.505 2.88 2.895-.41L11 19.5l2.101-2.033 2.895.41.505-2.88 2.583-1.37L17.8 11l1.284-2.627-2.583-1.37-.505-2.88zm-6.868 6.89l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#43-b)"></path><path d="M6.233 11.423l3.429 3.428 5.65-6.17.038-.033-.005 1.398-5.683 6.206-3.429-3.429-.003-1.405.005.003z" fill="#d18800"></path></g></g></svg> : null}
                            {this.state.affiliated_with?.badge?.url ? <img alt={this.state.affiliated_with.description} title={this.state.affiliated_with.description} src={this.state.affiliated_with.badge.url} style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }}/>:null}
                            {this.state.protected ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"></path></g></svg> : null}
                        </Typography>

                        <Typography variant="h5"><UserMenu tabs={this.props.tabs} platform={this.state.platform} screen_name={this.state.screen_name} addToQuery={this.props.addToQuery} anonymousMode={this.state.anonymousMode}/></Typography>

                        {(this.state.platform === "Twitter" || this.state.platform === "Mastodon") && <React.Fragment>
                        <Box m={2}>
                            <Grid
                                container
                                direction="row"
                                spacing={3}
                                alignItems="flex-start">

                                <Grid item xs={6}>
                                    <Typography variant="body1"><b>{this.state.following}</b> {t("dashboard.user.following")}</Typography>
                                </Grid>

                                <Grid item xs={6}>
                                    <Typography variant="body1"><b>{this.state.followers}</b> {t("dashboard.user.followers")}</Typography>
                                </Grid>

                            </Grid>
                        </Box>

                        <Grid item xs={11}>
                            <Typography component="div" variant="body1">{this.state.description}</Typography>
                        </Grid>

                        <Box m={2} />

                        <Grid
                            container
                            direction="row"
                            spacing={3}
                            alignItems="flex-start">

                            {this.state.location ?
                                <Grid item xs={6}>
                                    <Typography variant="body1">
                                        <svg style={{ paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path d="M12 14.315c-2.088 0-3.787-1.698-3.787-3.786S9.913 6.74 12 6.74s3.787 1.7 3.787 3.787-1.7 3.785-3.787 3.785zm0-6.073c-1.26 0-2.287 1.026-2.287 2.287S10.74 12.814 12 12.814s2.287-1.025 2.287-2.286S13.26 8.24 12 8.24z"></path><path d="M20.692 10.69C20.692 5.9 16.792 2 12 2s-8.692 3.9-8.692 8.69c0 1.902.603 3.708 1.743 5.223l.003-.002.007.015c1.628 2.07 6.278 5.757 6.475 5.912.138.11.302.163.465.163.163 0 .327-.053.465-.162.197-.155 4.847-3.84 6.475-5.912l.007-.014.002.002c1.14-1.516 1.742-3.32 1.742-5.223zM12 20.29c-1.224-.99-4.52-3.715-5.756-5.285-.94-1.25-1.436-2.742-1.436-4.312C4.808 6.727 8.035 3.5 12 3.5s7.192 3.226 7.192 7.19c0 1.57-.497 3.062-1.436 4.313-1.236 1.57-4.532 4.294-5.756 5.285z"></path></g></svg>
                                        {this.state.location}
                                    </Typography>
                                </Grid>
                                : null}

                            {this.state.url ?
                                <Grid item xs={6}>
                                    <Typography variant="body1">
                                        <svg style={{ paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path d="M11.96 14.945c-.067 0-.136-.01-.203-.027-1.13-.318-2.097-.986-2.795-1.932-.832-1.125-1.176-2.508-.968-3.893s.942-2.605 2.068-3.438l3.53-2.608c2.322-1.716 5.61-1.224 7.33 1.1.83 1.127 1.175 2.51.967 3.895s-.943 2.605-2.07 3.438l-1.48 1.094c-.333.246-.804.175-1.05-.158-.246-.334-.176-.804.158-1.05l1.48-1.095c.803-.592 1.327-1.463 1.476-2.45.148-.988-.098-1.975-.69-2.778-1.225-1.656-3.572-2.01-5.23-.784l-3.53 2.608c-.802.593-1.326 1.464-1.475 2.45-.15.99.097 1.975.69 2.778.498.675 1.187 1.15 1.992 1.377.4.114.633.528.52.928-.092.33-.394.547-.722.547z"></path><path d="M7.27 22.054c-1.61 0-3.197-.735-4.225-2.125-.832-1.127-1.176-2.51-.968-3.894s.943-2.605 2.07-3.438l1.478-1.094c.334-.245.805-.175 1.05.158s.177.804-.157 1.05l-1.48 1.095c-.803.593-1.326 1.464-1.475 2.45-.148.99.097 1.975.69 2.778 1.225 1.657 3.57 2.01 5.23.785l3.528-2.608c1.658-1.225 2.01-3.57.785-5.23-.498-.674-1.187-1.15-1.992-1.376-.4-.113-.633-.527-.52-.927.112-.4.528-.63.926-.522 1.13.318 2.096.986 2.794 1.932 1.717 2.324 1.224 5.612-1.1 7.33l-3.53 2.608c-.933.693-2.023 1.026-3.105 1.026z"></path></g></svg>
                                        <Link href={this.state.url} target="_blank" underline="hover">{t("dashboard.user.homepage")}</Link>
                                    </Typography>
                                </Grid>
                                : null}

                        </Grid>

                        <Box m={5} />

                        <Typography variant="body1" paragraph>{t("dashboard.user.overview", {platform: this.state.platform, createdAt: this.state.created_at, accountAge: this.state.account_age})}</Typography>

                        <Divider />

                        {this.state.status && this.state.status !== "active" ?
                            <Typography variant="body1" style={{ color: "red" }} paragraph>{t("dashboard.user.status", {status: this.state.status})}</Typography>
                            : ""}

                        {this.state.platform === "Twitter" && <Box m={1}>
                            <Grid
                                container
                                direction="row"
                                spacing={0}
                                alignItems="flex-start">

                                <Grid item xs={4}>
                                    <Typography variant="h6">{this.state.tweets}</Typography><Typography variant="body1">{t("dashboard.user.tweets")}</Typography>
                                </Grid>

                                <Grid item xs={4}>
                                    <Typography variant="h6">{this.state.tweets_per_day}</Typography><Typography variant="body1">{t("dashboard.user.tweets_average")}</Typography>
                                </Grid>

                                <Grid item xs={4}>
                                    <Typography variant="h6">{this.state.lists}</Typography><Typography variant="body1">{t("dashboard.user.lists")}</Typography>
                                </Grid>
                            </Grid>
                        </Box>}
                        </React.Fragment>}

                        <Divider />

                        <Box m={1}>
                            <Typography variant="body2" paragraph>{t("dashboard.user.collectedAt", {collectedAt: this.state.tweet_date})}</Typography>
                        </Box>

                    </Grid>
                </Grid>
            </Paper>)
        );
    }

    render() {
        const { t } = this.props;

        if (this.state.error) {
            return (
                (<Paper key={this.props.screen_name} style={{ padding: 10, marginTop: 10, marginBottom: 5, textAlign: "center" }}>
                    <Grid
                        data-cy="userInformation"
                        container
                        spacing={0}
                        direction="column"
                        alignItems="center"
                        justifyContent="center">

                        <Grid item xs={5}>
                            <img style={{ borderRadius: "50%", maxWidth:"300px" }} width="100%" src="../default_profile_normal.png" alt="" />
                        </Grid>

                        <Grid item xs={11}>
                            <Typography variant="h5"><Link
                                href={"https://twitter.com/" + this.state.screen_name}
                                target="_blank"
                                underline="hover">@{this.anonym(this.state.screen_name)}</Link></Typography>
                        </Grid>

                        <Grid item xs={11}>
                            <Typography variant="body1">{this.state.error}</Typography>
                        </Grid>
                    </Grid>
                </Paper>)
            );
        }

        if(this.state.loading) {
            return (
                <Paper key={this.props.screen_name}
                       style={{padding: 50, marginTop: 10, marginBottom: 5, textAlign: "center"}}>
                    <Grid
                        data-cy="userInformation-loading"
                        container
                        spacing={0}
                        direction="column"
                        alignItems="center"
                        justifyContent="center">
                        <Grid item xs={11}>
                            <CircularProgress />
                        </Grid>
                    </Grid>
                </Paper>
            )
        } else {

            if (this.state.status !== "active") {

                return (
                    <Paper key={this.props.screen_name}
                           style={{padding: 10, marginTop: 10, marginBottom: 5, textAlign: "center"}}>
                        <Grid
                            data-cy="userInformation"
                            container
                            spacing={0}
                            direction="column"
                            alignItems="center"
                            justifyContent="center">

                            <Grid item xs={5}>
                                <img style={{borderRadius: "50%", maxWidth: "300px"}} width="100%"
                                     src="../default_profile_normal.png" alt=""/>
                            </Grid>

                            <Grid item xs={11}>
                                <Typography variant="body1" style={{color: "red"}}
                                            paragraph>{t("dashboard.user.compliance", {
                                    screen_name: this.anonym(this.state.screen_name),
                                    status: this.state.status
                                })}</Typography>
                            </Grid>

                            <Grid item xs={11}>
                                <Typography variant="body1">{this.state.error}</Typography>
                            </Grid>
                        </Grid>
                    </Paper>)
            }

            if (this.state.bios === undefined || this.state.bios.length <= 0) return this.summary(t);

            return (
                <Box sx={{width: '100%', typography: 'body1'}}>
                    <TabContext value={this.state.tab}>
                        <Box sx={{borderBottom: 1, borderColor: 'silver'}}>
                            <TabList onChange={this.handleChange}>
                                <Tab label={t("dashboard.user.summary")} value="0"/>
                                <Tab label={t("dashboard.user.bios")} value="1"/>
                            </TabList>
                        </Box>
                        <TabPanel value="0">{this.summary(t)}</TabPanel>
                        <TabPanel value="1">{this.bios(t)}</TabPanel>
                    </TabContext>
                </Box>

            )
        }
    }
}

const mapStateToProps = function(state) {
    return {
      colors: state.dashboard.location?.colors
    }
  }
  
  export default connect(mapStateToProps)(withTranslation()(User));
  