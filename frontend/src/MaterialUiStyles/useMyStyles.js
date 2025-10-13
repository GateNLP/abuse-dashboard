import makeStyles from '@mui/styles/makeStyles';

const useMyStyles = makeStyles(theme => ({
    
    footer: {
        padding: theme.spacing(10, 5),
        textAlign: "center",
        bottom: 0,
        opacity: 0.4,
    },

    headerUpladedImage: {
        paddingTop: "11px!important",
        paddingBottom: "11px!important",
    },

}));

export default useMyStyles;

