import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import makeStyles from '@mui/styles/makeStyles';
import { useDispatch, useSelector } from "react-redux";
import {setSnackMessage} from "../redux/actions/dashboardActions";

function Alert(props) {
  return <MuiAlert elevation={6} variant="filled" {...props} />;
}

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    '& > * + *': {
      marginTop: theme.spacing(2),
    },
  },
}));

export default function CustomizedSnackbar() {
  const classes = useStyles();
  const dispatch = useDispatch();

  const message = useSelector((state) => state.dashboard.snackMessage);
  const severity = useSelector((state) => state.dashboard.snackSeverity);
  const autoHideDuration = useSelector((state) => state.dashboard.snackAutoHideDuration);

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    dispatch(setSnackMessage(""))
  };



  return (
    <div className={classes.root}>
      <Snackbar open={message?true:false} autoHideDuration={autoHideDuration?autoHideDuration:4000} onClose={handleClose}>
        <Alert onClose={handleClose} severity={severity?severity:"info"}>
          {message}
        </Alert>
      </Snackbar>
    </div>
  );
}
