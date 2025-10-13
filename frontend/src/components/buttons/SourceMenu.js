import React, { useState } from "react";

import Link from "@mui/material/Link";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { withTranslation } from "react-i18next";

import SearchIcon from '@mui/icons-material/Search';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const SourceMenu = ({ t, addToQuery, text, url, orig, children = null }) => {

    const [anchorEl, setAnchorEl] = useState(null);
    const handleClick = (event) => {
        event.preventDefault();
        setAnchorEl(event.currentTarget);
    };
    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleAddToQuery = (event) => {
        addToQuery(orig, "sources");
        handleClose();
    }

    const handleViewSource = (event) => {
        event.preventDefault();
        handleClose();
        window.open(url, "_blank");
    }

    return (
        (<React.Fragment>
            {!children && <Link href="#" onClick={handleClick} underline="hover">{text}</Link>}
            {children && <Link href="#" onClick={handleClick} underline="hover">{children}</Link>}
            <Menu anchorEl={anchorEl}
                open={!!anchorEl}
                onClose={handleClose}>
                <MenuItem onClick={handleAddToQuery}><SearchIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.sourceMenu.filter")}</MenuItem>
                <MenuItem onClick={handleViewSource}><OpenInNewIcon fontSize="small" style={{paddingRight:"1ex"}}/> {t("components.sourceMenu.visit")}</MenuItem>
            </Menu>
        </React.Fragment>)
    );
}

export default withTranslation()(SourceMenu);