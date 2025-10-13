import React, { useState, useEffect } from "react";
import Grid from "@mui/material/Grid";
import { Box, TextField, Button } from "@mui/material";
import { setUserSearchQuery } from "../redux/actions/userSearchActions";
import { useDispatch, useSelector } from "react-redux";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableSortLabel from '@mui/material/TableSortLabel';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Collapse from '@mui/material/Collapse';

import TablePagination from "@mui/material/TablePagination";

import LinearProgress from "@mui/material/LinearProgress";

import useMyStyles from "../MaterialUiStyles/useMyStyles";

import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import User from "../Results/User"

import Typography from "@mui/material/Typography";
import Alert from '@mui/material/Alert';

import { useTranslation } from 'react-i18next';

import IconButton from "@mui/material/IconButton";

import {withLinks} from "../linkify";

import UserMenu from "../components/buttons/UserMenu"

import { scaleLinear } from "d3-scale";

import InfoIcon from "@mui/icons-material/Info";
import Tooltip from "@mui/material/Tooltip";

const UserSearch = (props) => {

    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    const dispatch = useDispatch();
    const classes = useMyStyles();

    const [order, setOrder] = React.useState('desc');
    const [orderBy, setOrderBy] = React.useState('relevance');

    

    

    const createSortHandler = (property) => (event) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
        setPage(0);
    };


    const anonymousMode = useSelector((state) => state.dashboard.settings.anonymousMode);

    const query = useSelector(state => state.userSearch.query);
    const users = useSelector(state => state.userSearch.users);
    const loading = useSelector(state => state.userSearch.loading);
    const totals = useSelector(state => state.userSearch.totals);

    const flashType = useSelector(state => state.userSearch.flashType);
    const flashMessage = useSelector(state => state.userSearch.flashMessage);

    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const [openDescription, setOpenDescription] = React.useState(false);

    const toggleDescription = () => {
        setOpenDescription(!openDescription);
    }

    const linear = React.useMemo(() => {
        if (!users) return null;

        var min = 0;
        var max = 0;

        users.forEach((user,i) => {
            if (i === 0) {
                min = user.relevance;
                max = user.relevance;
            } else {
                min = Math.min(min, user.relevance);
                max = Math.max(max, user.relevance);
            }
        });

        return scaleLinear().domain([0, max]).range([0, 1]);
    }, [users]);

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const [userInput, setUserInput] = useState(query);

    useEffect(() => {
        setUserInput(query)
     },[query])

    const submitUrl = (query) => {
        dispatch(setUserSearchQuery(query))
    };

    const [openUser, setOpenUser] = React.useState(false);
    const [screenName, setScreenName] = React.useState(null);
    const [date, setDate] = React.useState(null);

    const handleOpenUser = (screen_name, date) => {
        setScreenName(screen_name);
        setDate(date);
        setOpenUser(true);
    };

    const handleCloseUser = () => {
        setOpenUser(false);
        setScreenName(null);
    };

    const visibleRows = React.useMemo(
        () => {

            function descendingComparator(a, b, orderBy) {

                // TODO handle the -1 case to push them to the end (i.e. max time)
        
                var aV = a[orderBy] === -1 ? Number.MAX_SAFE_INTEGER : a[orderBy];
                var bV = b[orderBy] === -1 ? Number.MAX_SAFE_INTEGER : b[orderBy];
        
                if (orderBy === "screen_name") {
                    aV = aV.toLowerCase();
                    bV = bV.toLowerCase();
                }
        
                if (bV < aV) {
                    return -1;
                }
                if (bV > aV) {
                    return 1;
                }
                return 0;
            }

            function getComparator(order, orderBy) {
                return order === 'desc'
                    ? (a, b) => descendingComparator(a, b, orderBy)
                    : (a, b) => -descendingComparator(a, b, orderBy);
            }

            if (users == null) return [];

            return users.sort(getComparator(order, orderBy)).slice(
            page * rowsPerPage,
            page * rowsPerPage + rowsPerPage,
          )},
        [order, orderBy, page, rowsPerPage, users],
      );
    

    return (
        <Box mt={3}>
            <Grid
                container
                direction="row"
                spacing={3}
                alignItems="center"
                data-cy="dashboardFilters">

                <Grid item xs={12}>
                    
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant={"body1"} paragraph={true}>{t("dashboard.userSearch.description")}</Typography>
                        <Tooltip title={`${openDescription ? "Hide" : "Show more"} details`}>
                            <IconButton onClick={toggleDescription} size="large">
                                <InfoIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Collapse in={openDescription}>
                        <Typography variant={"body1"} style={{fontStyle: "italic"}} paragraph={true}>{t("dashboard.userSearch.note")}</Typography>
                    </Collapse>
                </Grid>

                <Grid p={2} item xs data-cy="userSearchQuery">
                    <TextField
                        data-cy='user-search-textfield'
                        id="userSearchQuery"
                        fullWidth
                        variant="outlined"
                        value={userInput || ""}
                        onChange={e => setUserInput(e.target.value)}
                        onKeyPress={e => {
                            if (e.key === 'Enter') {
                                submitUrl(userInput)
                            }
                        }}
                    />
                </Grid>

                <Grid item data-cy="userSearchSubmit">
                    <Button data-cy='user-search-button' variant="contained" color="primary" onClick={() => submitUrl(userInput)}>
                        {t("dashboard.userSearch.search")}
                    </Button>

                </Grid>



            </Grid>
            <Box m={2} />
            {loading && <LinearProgress/>}
            {flashMessage ? <Box mt={3}><Alert severity={flashType}>{flashMessage}</Alert></Box> : null}
            {totals === null ? null :
                <React.Fragment>

                    <Grid
                        container
                        direction="row"
                        spacing={3}
                        alignItems="center"
                        data-cy="dashboardFilters">

                        {users?.length > 0 ?
                            <Grid item xs={12}>
                                <Typography paragraph variant={"body1"}>{t("dashboard.userSearch.results", {users: totals.users.toLocaleString(), tweets: totals.tweets.toLocaleString()})}</Typography>

                                <TableContainer component={Paper} >
                                    <Table stickyHeader data-cy={users.length+"-search-results"} className={classes.table}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={orderBy === "screen_name"}
                                                        direction={orderBy === "screen_name" ? order : 'asc'}
                                                        onClick={createSortHandler("screen_name")}>
                                                        {t("dashboard.user.screen_name")}
                                                    </TableSortLabel>
                                                </TableCell>
                                                {/*<TableCell>{t("dashboard.userSearch.viewUser")}</TableCell>*/}
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={orderBy === "hits"}
                                                        direction={orderBy === "hits" ? order : 'asc'}
                                                        onClick={createSortHandler("hits")}>
                                                        {t("dashboard.userSearch.hits")}
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={orderBy === "relevance"}
                                                        direction={orderBy === "relevance" ? order : 'asc'}
                                                        onClick={createSortHandler("relevance")}>
                                                        {t("dashboard.userSearch.relevance")}
                                                    </TableSortLabel>
                                                </TableCell>
                                                <TableCell>
                                                    <TableSortLabel
                                                        active={orderBy === "age"}
                                                        direction={orderBy === "age" ? order : 'asc'}
                                                        onClick={createSortHandler("age")}>
                                                        {t("dashboard.user.account_age")}
                                                    </TableSortLabel>
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>

                                            {visibleRows.map((user, key) => (
                                                <React.Fragment key={"user-"+key}>
                                                <TableRow key={key} data-cy={"searchResult"}>
                                                    {/*<TableCell>{key + 1}. <Link href="#" onClick={(e) => { e.preventDefault(); props.addToQuery(user.screen_name, "author") }}>{getPlatformIcon(user.platform,{ verticalAlign: "middle", height: "0.8em" })}{anonymize(user.screen_name, anonymousMode)}</Link></TableCell>
                                                    <TableCell><Link href="#" onClick={(e) => handleOpenUser(e, user.screen_name, user.tweeted_at)}><ViewIcon style={{ verticalAlign: "middle" }} /></Link></TableCell>*/}
                                                    <TableCell data-cy="screenName">{(page*rowsPerPage)+key+1}. <UserMenu tabs={props.tabs} platform={user.platform} screen_name={user.screen_name} addToQuery={props.addToQuery} anonymousMode={anonymousMode} viewUser={handleOpenUser} date={user.tweeted_at} /></TableCell>
                                                    <TableCell>{user.hits.toLocaleString()}</TableCell>
                                                    <TableCell>{linear(user.relevance).toFixed(2)}</TableCell>
                                                    <TableCell>{user.age.toLocaleString()}</TableCell>
                                                </TableRow>

                                                {user.bios ?
                                                    user.bios.map((bio, bk) => (
                                                        <TableRow key={"bio-"+bk}>
                                                            <TableCell style={{paddingLeft: "3em"}} colSpan={2}>{withLinks(bio.description, user.platform, props.addToQuery, handleOpenUser, props.tabs)}</TableCell>
                                                            <TableCell>{bio.earliest} to {bio.latest}: <span style={{whiteSpace:"nowrap"}}>{bio.count} {t(bio.count > 1 ? "dashboard.userSearch.posts" : "dashboard.userSearch.post")}</span></TableCell>
                                                    </TableRow>
                                                    ))
                                                : null}</React.Fragment>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                <TablePagination
                                    rowsPerPageOptions={[5, 10, 25]}
                                    component="div"
                                    count={users.length}
                                    rowsPerPage={rowsPerPage}
                                    page={page}
                                    onPageChange={handleChangePage}
                                    onRowsPerPageChange={handleChangeRowsPerPage}
                                />
                            </Grid> : null}
                    </Grid>
                    
                </React.Fragment>
            }
            <Dialog
                open={openUser}
                onClose={handleCloseUser}
                maxWidth="md"
                data-cy="searchOpenUser">
                <DialogContent>
                    <User screen_name={screenName} anonymousMode={anonymousMode} date={date} addToQuery={props.addToQuery}/>
                </DialogContent>
            </Dialog>
        </Box>
    );
}

export default UserSearch;