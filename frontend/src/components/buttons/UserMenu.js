import React, { useState } from "react";

import Link from "@mui/material/Link";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { withTranslation } from "react-i18next";

import SearchIcon from '@mui/icons-material/Search';
import ViewIcon from '@mui/icons-material/VisibilityOutlined';

import { setUserSearchQuery } from "../../redux/actions/userSearchActions";

import { useDispatch } from "react-redux";

import { anonymize, getPlatformIcon, getAccountLink } from "../../api";

const UserMenu = ({ t, users = null, addToQuery, screen_name, anonymousMode, viewUser, tabs = null, date = null, platform = null, children = null }) => {

    const dispatch = useDispatch();

    const [anchorEl, setAnchorEl] = useState(null);
    const handleClick = (event) => {
        event.preventDefault();
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAddToQuery = (event) => {
        if (event.currentTarget.dataset.type === "relevantTo") {
            addToQuery([screen_name,platform],event.currentTarget.dataset.type);
        } else {
            addToQuery(screen_name, event.currentTarget.dataset.type);
        }
        handleClose();
    }

    const handleViewUser = (event) => {
        event.preventDefault();
        handleClose();
        viewUser(screen_name, date);
    }

    const handlePlatformView = (event) => {
        event.preventDefault();
        handleClose();
        window.open(getAccountLink(platform, screen_name), "_blank");
    }

    const handleFindSimilar = (event) => {
        event.preventDefault();
        handleClose();
        dispatch(setUserSearchQuery("@"+screen_name));
        if (tabs !== null) {
            tabs("userSearch")
        }
    }

    // nasty hack for the facebook data. would be nicer if we just didn't add it to the index
    if (screen_name === null || screen_name === undefined || screen_name === "UNKNOWN FACEBOOK USER") {
        return (
            <React.Fragment>
                {!children && <span>{platform && getPlatformIcon(platform, { verticalAlign: "middle", height: "1em" })} Unknown User</span>}
                {children && children}
            </React.Fragment>
        )
    }


    return (
        (<React.Fragment>
            {!children && <Link
                href="#"
                data-screen-name={screen_name}
                onClick={handleClick}
                underline="hover">
                {platform && getPlatformIcon(platform, { verticalAlign: "middle", height: "1em" })} {anonymize(screen_name, anonymousMode)}
            </Link>}
            {children && <Link
                href="#"
                data-screen-name={screen_name}
                onClick={handleClick}
                underline="hover">{children}</Link>}
            <Menu anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={handleClose}>
                <MenuItem onClick={handleAddToQuery} data-type="author"><SearchIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.userMenu.authorFilter")}</MenuItem>
                <MenuItem onClick={handleAddToQuery} data-type="mention"><SearchIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.userMenu.mentionFilter")}</MenuItem>
                <MenuItem onClick={handleAddToQuery} data-type="inReplyTo"><SearchIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.userMenu.replyToFilter")}</MenuItem>
                {users != null && users.includes(screen_name+"|"+platform) && <MenuItem onClick={handleAddToQuery} data-type="relevantTo"><SearchIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.userMenu.relevantToFilter")}</MenuItem>}
                {tabs && <MenuItem onClick={handleFindSimilar}><SearchIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.userMenu.similar")}</MenuItem>}
                {viewUser && <MenuItem onClick={handleViewUser}><ViewIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.userMenu.view")}</MenuItem>}
                {platform && <MenuItem onClick={handlePlatformView}>{getPlatformIcon(platform, {width: "20px", paddingRight: "1ex"})} {t("components.userMenu.viewOn", {platform: platform})}</MenuItem>}
            </Menu>
        </React.Fragment>)
    );
}

export default withTranslation()(UserMenu);