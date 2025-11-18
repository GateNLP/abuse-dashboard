import React from "react";
import { useDispatch, useSelector } from "react-redux";

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import TwitterIcon from "@mui/icons-material/Twitter";
import CopyIcon from "@mui/icons-material/FileCopy";
import ExploreIcon from "@mui/icons-material/Explore";

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';

import User from "./User";

import ViewIcon from '@mui/icons-material/VisibilityOutlined';
import TranslateIcon from '@mui/icons-material/GTranslate';
import ParentIcon from '@mui/icons-material/ArrowUpward';

import DeletedIcon from '@mui/icons-material/Delete'
import SuspendedIcon from '@mui/icons-material/PauseCircleFilled'

import Typography from "@mui/material/Typography";

import { anonymize, getPlatformIcon, getPostLink, getParentPostLink, abuseTypeColors } from "../api";

import Blur from 'react-css-blur';

import {setTweetID} from "../redux/actions/conversationActions";

import Modal from '@mui/material/Modal';

import { withTranslation } from "react-i18next";
import { withLinks } from "../linkify";

import UserMenu from "../components/buttons/UserMenu"
import SourceMenu from "../components/buttons/SourceMenu"

import PDFReport from "../components/buttons/PDFReport"

import Chip from '@mui/material/Chip';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'auto',
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
};

function TweetView(props) {



    const dispatch = useDispatch();

    const i = props.data;

    const t = props.t;

    const showChips = props.showChips;

    const tabs = props.tabs || null;

    const addToQuery = props.addToQuery;

    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);
    const complianceMode = useSelector((state) => state.dashboard.settings.complianceMode);
    const handle = useSelector((state) => state.dashboard.user.screen_name);
    const colors = useSelector(state => state.dashboard.location?.colors);

    const [openUser, setOpenUser] = React.useState(false);

    const [imgUrl, setImageUrl] = React.useState("../default_profile_normal.png")
    const [urlChecked, setImageUrlChecked] = React.useState(false);

    const [screenName, setScreenName] = React.useState(null);


    const handleOpenUser = (screen_name) => {
        //e.preventDefault();
        setScreenName(screen_name);
        setOpenUser(true);
    }

    const handleCloseUser = () => {
        setOpenUser(false);
    }

    const indicatorLabels = new Array(25).fill(null);
    indicatorLabels[0] = "Death/Rape Threat";
    indicatorLabels[1] = "Other Violence Threat"
    indicatorLabels[2] = "Political Involvement";
    indicatorLabels[3] = "Proximity of Perpetrator";
    indicatorLabels[4] = "Impunity";
    indicatorLabels[5] = "Threat to Family";
    indicatorLabels[6] = "Doxxing";
    indicatorLabels[7] = "Surveillance";
    indicatorLabels[8] = "Physical Context";
    indicatorLabels[9] = "Psychological Harm"
    indicatorLabels[10] = "Seeding Hashtags/Narratives";
    indicatorLabels[11] = "Coordinated Disinfo";
    indicatorLabels[12] = "Orchestrated Attacks";
    indicatorLabels[13] = "Misogynistic";
    indicatorLabels[14] = "Intersectional Abuse";
    indicatorLabels[15] = "Media Involvement";
    indicatorLabels[16] = "Witch";
    indicatorLabels[17] = "Reputational";
    indicatorLabels[18] = "Corruption";
    indicatorLabels[19] = "Dehumanization";
    indicatorLabels[20] = "Mental Health";
    indicatorLabels[21] = "Call for Arrest";
    indicatorLabels[22] = "Sexualization";
    indicatorLabels[23] = "Celebrating Death";
    indicatorLabels[24] = "Misc. Insult";

    const iMatches = [];

    if (i.indicators) {
        for (var j = 0 ; j < i.indicators.length ; ++j) {
            var label = indicatorLabels[i.indicators[j]];

            if (label != null) iMatches.push(label);
        }
    }

    const [open, setOpen] = React.useState(false);
    const [currentImage, setImage] = React.useState("");

    const handleOpen = (e, img) => {
        e.preventDefault();
        setImage(img);
        setOpen(true);
    }
    const handleClose = () => setOpen(false);

    const analyseConversation = (src) => {
        dispatch(setTweetID(src));
        tabs("conversation");
    };

    if (!urlChecked) {

        var noProtocol = i.user.profile_image_url_https;
        if (noProtocol !== undefined && noProtocol !== null) {

            if (i.platform !== "Twitter" || noProtocol.startsWith("data")) {
                setImageUrlChecked(true);
                setImageUrl(noProtocol)
            } else {

            noProtocol = noProtocol.substring(noProtocol.indexOf(":") + 1);

            fetch(noProtocol, { method: 'HEAD' })
                .then((response) => {
                    if (response.ok && response.url.indexOf("static/deleted") === -1) {
                        setImageUrlChecked(true);
                        setImageUrl(noProtocol)
                    }
                },
                    (error) => {
                        // for now just log the error to the console
                        console.log(error);
                    })
        } }
    }

    if (i === null) {
        return null;
    }

    

    if (i.text === null) {
        return (
            (<Paper id={props.id} style={{ padding: 10, marginTop: 10, marginBottom: 5, textAlign: "center", width:"100%" }}>
                <Grid
                    data-cy={"tweet-"+i.id}
                    container
                    spacing={0}
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="flex-start">

                    <Grid item xs={1} style={{ textAlign: "left" }}>
                        <img style={{ borderRadius: "50%" }} width="100%" src="../default_profile_normal.png" alt="" />
                    </Grid>

                    <Grid item xs={11} style={{ paddingLeft: "2ex" }}>
                        <Grid
                            container
                            spacing={0}
                            direction="column"
                            alignItems="flex-start"
                            justifyContent="flex-start">

                            <Grid item xs={12} style={{ width: "100%" }}>
                                <Typography variant={"body1"} paragraph>{t("dashboard.tweetView.missing", {screen_name: i.screen_name})}</Typography>

                                <Link
                                    href={"https://twitter.com/"+i.screen_name+"/status/"+i.id}
                                    target="_blank"
                                    underline="hover">{"https://twitter.com/"+i.screen_name+"/status/"+i.id}</Link>
                            </Grid>

                            <Grid item xs={12} style={{ width: "100%" }}>
                                <span style={{ float: "right" }}>

                                    <Link
                                        data-cy="viewUserInformation"
                                        title={t("dashboard.tweetView.user")}
                                        href="#"
                                        onClick={(e) => handleOpenUser(i.screen_name)}
                                        underline="hover"><ViewIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link>

                                    <Link
                                        data-cy="copyTweetToClipboard"
                                        title={t("dashboard.tweetView.copy")}
                                        href="#"
                                        onClick={e => { e.preventDefault(); navigator.clipboard.writeText("https://twitter.com/" + i.screen_name + "/status/" + i.id); }}
                                        underline="hover"><CopyIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link>

                                    <Link
                                        data-cy="viewTweet"
                                        title={t("dashboard.tweetView.view")}
                                        href={"https://twitter.com/" + i.screen_name + "/status/" + i.id}
                                        target="_blank"
                                        underline="hover"><TwitterIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link>

                                </span>
                            </Grid>
                        </Grid>
                    </Grid>
                </Grid>
                <Dialog
                    open={openUser}
                    onClose={handleCloseUser}
                    maxWidth="md">
                    <DialogContent>
                        <User screen_name={screenName} anonymousMode={anonymousMode} addToQuery={addToQuery}/>
                    </DialogContent>
                </Dialog>
            </Paper>)
        );
    }

    return (
        (<React.Fragment>
            <Paper data-cy={"tweet-"+i.id} id={props.id} style={{ padding: 10, marginTop: 10, marginBottom: 5, textAlign: "center"}}>
                <Blur radius={complianceMode && i?.compliance?.reason ? "7px" : "0"}>
                    <Grid
                        container
                        spacing={0}
                        direction="row"
                        alignItems="flex-start"
                        justifyContent="flex-start">

                        <Grid item xs={1} style={{ textAlign: "left" }}>
                            <img style={{ borderRadius: "50%", border:`3px solid ${colors[i.platform]}` }} width="100%" src={i.user.screen_name !== handle && anonymousMode ? "../default_profile_normal.png" : imgUrl} alt="" />
                        </Grid>

                        <Grid item xs={11} style={{ paddingLeft: "2ex" }}>
                            <Grid
                                container
                                spacing={0}
                                direction="column"
                                alignItems="flex-start"
                                justifyContent="flex-start">

                                {i.compliance?.reason ?
                                    <Grid item xs={12} style={{ width: "100%" }}>
                                        {i.compliance?.reason === "suspended" ? <Typography gutterBottom="true" variant="button" color="error" style={{float:"left"}}><SuspendedIcon titleAccess={t("dashboard.tweetView.compliance.suspended")} style={{ verticalAlign: "middle", height: "1em" }}/> {t("dashboard.tweetView.compliance.suspended")}</Typography>: null}
                                        {i.compliance?.reason === "deleted" ? <Typography gutterBottom="true" variant="button" color="error" style={{float:"left"}}><DeletedIcon titleAccess={t("dashboard.tweetView.compliance.suspended")} style={{ verticalAlign: "middle", height: "1em" }}/> {t("dashboard.tweetView.compliance.deleted")}</Typography>: null}
                                    </Grid>
                                : null}

                                <Grid item xs={12} style={{ width: "100%" }}>
                                    <span data-cy="displayName" style={{ float: "left", fontWeight: "600" }}>{anonymize(i.user.name, i.user.screen_name !== handle && anonymousMode)}
                                        {i.user.verified || i.user.is_blue_verified ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" style={{ fill: "#1da1f2", fillOpacity: 1 }} /></g></svg> : null}
                                        {i.user?.verified_type === "Government" ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 22 22" aria-label="Verified account" role="img" data-testid="icon-verified"><g><path clipRule="evenodd" d="M12.05 2.056c-.568-.608-1.532-.608-2.1 0l-1.393 1.49c-.284.303-.685.47-1.1.455L5.42 3.932c-.832-.028-1.514.654-1.486 1.486l.069 2.039c.014.415-.152.816-.456 1.1l-1.49 1.392c-.608.568-.608 1.533 0 2.101l1.49 1.393c.304.284.47.684.456 1.1l-.07 2.038c-.027.832.655 1.514 1.487 1.486l2.038-.069c.415-.014.816.152 1.1.455l1.392 1.49c.569.609 1.533.609 2.102 0l1.393-1.49c.283-.303.684-.47 1.099-.455l2.038.069c.832.028 1.515-.654 1.486-1.486L18 14.542c-.015-.415.152-.815.455-1.099l1.49-1.393c.608-.568.608-1.533 0-2.101l-1.49-1.393c-.303-.283-.47-.684-.455-1.1l.068-2.038c.029-.832-.654-1.514-1.486-1.486l-2.038.07c-.415.013-.816-.153-1.1-.456zm-5.817 9.367l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="#829aab" fillRule="evenodd"></path></g></svg> : null}
                                        {i.user?.verified_type === "Business" ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 22 22" aria-label="Verified account" role="img" data-testid="icon-verified"><g><linearGradient gradientUnits="userSpaceOnUse" id="43-a" x1="4.411" x2="18.083" y1="2.495" y2="21.508"><stop offset="0" stopColor="#f4e72a"></stop><stop offset=".539" stopColor="#cd8105"></stop><stop offset=".68" stopColor="#cb7b00"></stop><stop offset="1" stopColor="#f4ec26"></stop><stop offset="1" stopColor="#f4e72a"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="43-b" x1="5.355" x2="16.361" y1="3.395" y2="19.133"><stop offset="0" stopColor="#f9e87f"></stop><stop offset=".406" stopColor="#e2b719"></stop><stop offset=".989" stopColor="#e2b719"></stop></linearGradient><g clipRule="evenodd" fillRule="evenodd"><path d="M13.324 3.848L11 1.6 8.676 3.848l-3.201-.453-.559 3.184L2.06 8.095 3.48 11l-1.42 2.904 2.856 1.516.559 3.184 3.201-.452L11 20.4l2.324-2.248 3.201.452.559-3.184 2.856-1.516L18.52 11l1.42-2.905-2.856-1.516-.559-3.184zm-7.09 7.575l3.428 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#43-a)"></path><path d="M13.101 4.533L11 2.5 8.899 4.533l-2.895-.41-.505 2.88-2.583 1.37L4.2 11l-1.284 2.627 2.583 1.37.505 2.88 2.895-.41L11 19.5l2.101-2.033 2.895.41.505-2.88 2.583-1.37L17.8 11l1.284-2.627-2.583-1.37-.505-2.88zm-6.868 6.89l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#43-b)"></path><path d="M6.233 11.423l3.429 3.428 5.65-6.17.038-.033-.005 1.398-5.683 6.206-3.429-3.429-.003-1.405.005.003z" fill="#d18800"></path></g></g></svg> : null}
                                        {i.user?.affiliated_with?.badge?.url ? <img alt={i.user.affiliated_with.description} title={i.user.affiliated_with.description} src={i.user.affiliated_with.badge.url} style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }}/>:null}
                                        {i.user.protected ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"></path></g></svg> : null}
                                    </span>

                                    <span data-cy="createdAt" style={{ float: "right", fontSize: "80%", color: "grey" }}>{i.created_at_time}</span>
                                </Grid>

                                <Grid item xs={12} style={{ width: "100%" }}>
                                    {/*<span style={{ float: "left" }}><Link data-cy="screenName" href={getAccountLink(i.platform, i.user.screen_name)} target="_blank">{getPlatformIcon(i.platform, { verticalAlign: "middle", height: "1em" })}{anonymize(i.user.screen_name, i.user.screen_name !== handle && anonymousMode)}</Link></span>*/}
                                    <span style={{ float: "left" }}><UserMenu tabs={tabs} platform={i.platform} screen_name={i.user.screen_name} addToQuery={addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser}/></span>
                                    <span style={{ float: "right", fontSize: "80%", color: "grey" }}></span>
                                </Grid>

                                

                                <Grid data-cy="text" item xs={12} style={{ textAlign: "left", paddingTop: "1ex", width: "100%" }}>
                                    <span style={{ width: "100%" }}>{withLinks(i.text, i.platform, addToQuery, handleOpenUser, tabs)}</span>
                                </Grid>

                                {i.images.length > 0 ?
                                    <Grid item xs={12} style={{ textAlign: "left", paddingTop: "1ex", width: "100%" }}>
                                        {i.images.map((img, index) => (
                                            <Link
                                                key={index}
                                                onClick={(e) => handleOpen(e,img)}
                                                href={img}
                                                target="_blank"
                                                underline="hover"><img alt="" src={img} style={{width:"25%", padding:"0.5em", boxSizing: "border-box"}}/></Link>
                                        ))}
                                    </Grid>
                                : null}

                                <Grid item xs={12} style={{ textAlign: "left", paddingTop: "1ex", width: "100%" }}>
                                    {i.retweet_count > 0 && props.sort ?

                                        i.retweet_count > 0 ?
                                            <span style={{ fontSize: "80%", color: "grey" }}>
                                                <svg style={{ paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24" aria-hidden="true" ><g><path style={{ fill: "grey", fillOpacity: 1 }} d="M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z"></path></g></svg> {i.sort[props.sort === "2" ? 0 : 2].toLocaleString()}
                                                <svg style={{ paddingLeft: "2em", paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path style={{ fill: "grey" }} d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"></path></g></svg> {i.sort[props.sort === "1" ? 0 : 1].toLocaleString()}
                                                <svg style={{ paddingLeft: "2em", paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24" aria-hidden="true"><g><path style={{ fill: "grey", fillOpacity: 1 }} d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z"></path></g></svg> {i.sort[props.sort === "3" ? 0 : 3].toLocaleString()}
                                            </span>
                                            :
                                            <span style={{ fontSize: "80%", color: "grey" }}>
                                                <svg style={{ paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24" aria-hidden="true"><g><path style={{ fill: "grey", fillOpacity: 1 }} d="M14.046 2.242l-4.148-.01h-.002c-4.374 0-7.8 3.427-7.8 7.802 0 4.098 3.186 7.206 7.465 7.37v3.828c0 .108.044.286.12.403.142.225.384.347.632.347.138 0 .277-.038.402-.118.264-.168 6.473-4.14 8.088-5.506 1.902-1.61 3.04-3.97 3.043-6.312v-.017c-.006-4.367-3.43-7.787-7.8-7.788zm3.787 12.972c-1.134.96-4.862 3.405-6.772 4.643V16.67c0-.414-.335-.75-.75-.75h-.396c-3.66 0-6.318-2.476-6.318-5.886 0-3.534 2.768-6.302 6.3-6.302l4.147.01h.002c3.532 0 6.3 2.766 6.302 6.296-.003 1.91-.942 3.844-2.514 5.176z"></path></g></svg> X
                                                <svg style={{ paddingLeft: "2em", paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24"><g><path style={{ fill: "grey" }} d="M23.77 15.67c-.292-.293-.767-.293-1.06 0l-2.22 2.22V7.65c0-2.068-1.683-3.75-3.75-3.75h-5.85c-.414 0-.75.336-.75.75s.336.75.75.75h5.85c1.24 0 2.25 1.01 2.25 2.25v10.24l-2.22-2.22c-.293-.293-.768-.293-1.06 0s-.294.768 0 1.06l3.5 3.5c.145.147.337.22.53.22s.383-.072.53-.22l3.5-3.5c.294-.292.294-.767 0-1.06zm-10.66 3.28H7.26c-1.24 0-2.25-1.01-2.25-2.25V6.46l2.22 2.22c.148.147.34.22.532.22s.384-.073.53-.22c.293-.293.293-.768 0-1.06l-3.5-3.5c-.293-.294-.768-.294-1.06 0l-3.5 3.5c-.294.292-.294.767 0 1.06s.767.293 1.06 0l2.22-2.22V16.7c0 2.068 1.683 3.75 3.75 3.75h5.85c.414 0 .75-.336.75-.75s-.337-.75-.75-.75z"></path></g></svg> 0
                                                <svg style={{ paddingLeft: "2em", paddingRight: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 24 24" aria-hidden="true"><g><path style={{ fill: "grey", fillOpacity: 1 }} d="M12 21.638h-.014C9.403 21.59 1.95 14.856 1.95 8.478c0-3.064 2.525-5.754 5.403-5.754 2.29 0 3.83 1.58 4.646 2.73.814-1.148 2.354-2.73 4.645-2.73 2.88 0 5.404 2.69 5.404 5.755 0 6.376-7.454 13.11-10.037 13.157H12zM7.354 4.225c-2.08 0-3.903 1.988-3.903 4.255 0 5.74 7.034 11.596 8.55 11.658 1.518-.062 8.55-5.917 8.55-11.658 0-2.267-1.823-4.255-3.903-4.255-2.528 0-3.94 2.936-3.952 2.965-.23.562-1.156.562-1.387 0-.014-.03-1.425-2.965-3.954-2.965z"></path></g></svg> X
                                            </span>

                                        : null}
                                    {iMatches.length > 0 &&
                                        <span style={{ fontSize: "80%", color: "grey" }}>{iMatches.join(", ")}</span>
                                    }


                                    {showChips && i.abuseTypes &&
                                        <span style={{ fontSize: "80%"}}>
                                            {i.abuseTypes.map((abuseType, i) => 
                                                <Chip sx={(theme) => ({marginRight: "0.5em", backgroundColor: abuseTypeColors[abuseType], color: theme.palette.getContrastText(abuseTypeColors[abuseType] ? abuseTypeColors[abuseType] : "#FFFFFF")})} label={t("dashboard.overview.abuse_types."+abuseType)} />
                                            )}
                                        </span>
                                    }

                                    {i.source && <SourceMenu addToQuery={props.addToQuery} text={i.source_text} url={i.source_url} orig={i.source}><span style={{fontSize: "80%", color: "grey"}}>{i.source_text}</span></SourceMenu>}
                                    

                                    <span style={{ float: "right" }}>

                                        {i.lang !== undefined && i.lang !== "en" && i.lang !== "und" ? <Link
                                            data-cy="btnTranslate"
                                            title={t("dashboard.tweetView.translate")}
                                            style={{ fontSize: "75%" }}
                                            href={"https://translate.google.co.uk/?sl=auto&tl=en&op=translate&text=" + encodeURIComponent(i.text)}
                                            target="_blank"
                                            underline="hover"><TranslateIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link> : null}

                                        {tabs !== null ? <Link
                                            data-cy="btnExplore"
                                            href="#"
                                            title={t("dashboard.tweetView.explore")}
                                            onClick={() => analyseConversation(i.id)}
                                            underline="hover"><ExploreIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link> : null}

                                        {i.in_reply_to != null ?
                                            <Link
                                                data-cy="btnParent"
                                                title={t("dashboard.tweetView.parent")}
                                                href={getParentPostLink(i)}
                                                target="_blank"
                                                underline="hover"><ParentIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link>
                                            : ""
                                        }

                                        {/*<Link data-cy="btnUserInfo" title={t("dashboard.tweetView.user")} href="#" onClick={(e) => handleOpenUser(e, i.user.screen_name)}><ViewIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link>*/}

                                        <Link
                                            data-cy="btnCopyToClipboard"
                                            title={t("dashboard.tweetView.copy")}
                                            href="#"
                                            onClick={e => { e.preventDefault(); navigator.clipboard.writeText(getPostLink(i)); }}
                                            underline="hover"><CopyIcon style={{ verticalAlign: "middle", height: "1em" }} /></Link>

                                        <Link
                                            data-cy="btnViewTweet"
                                            title={t("dashboard.tweetView.view")}
                                            href={getPostLink(i)}
                                            target="_blank"
                                            underline="hover">{getPlatformIcon(i.platform, { verticalAlign: "middle", height: "1em" })}</Link>

                                        {props.addToReport && <PDFReport type="post" data={i} addToReport={props.addToReport} />}

                                    </span>
                                </Grid>

                                {i.text_en !== null ?
                                    <Grid item xs={12} style={{ textAlign: "left", paddingTop: "1ex", width: "100%", color: "#2f90c2" }}>
                                        {i.text_en}
                                    </Grid>
                                    : ""}

                            </Grid>

                        </Grid>
                    </Grid>
                </Blur>
            </Paper>
            <Dialog
                open={openUser}
                onClose={handleCloseUser}
                maxWidth="md">
                <DialogContent>
                    <User screen_name={screenName} anonymousMode={anonymousMode} addToQuery={addToQuery} />
                </DialogContent>
            </Dialog>
            <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="modal-modal-title"
                aria-describedby="modal-modal-description"
            >
                <Box sx={style}>
                    <img alt="" style={{maxHeight:"80vh", maxWidth:"80vw"}}src={currentImage}/>
                </Box>
            </Modal>
        </React.Fragment>)
    );

}

export default withTranslation()(TweetView)
