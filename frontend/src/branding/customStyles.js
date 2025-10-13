import makeStyles from '@mui/styles/makeStyles';

const customStyles = makeStyles(theme => ({
    journalistCard: {
        height: 120,
        margin: 10,
        borderWidth: 1,
        borderColor: "green",
        '&:hover': {
            backgroundColor: "#e6ffe6",
            cursor: "pointer"
        },
        display: "flex",
        overflow: "hidden"
    },
    journalistName: {
        fontSize: 15,
    },
    journalistCountry: {
        fontSize: 12,
        fontStyle: "italic"

    }
}));
export default customStyles;