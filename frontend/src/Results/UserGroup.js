import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

const UserGroup = (props) => {

    const { image, description, title } = props;



    return (
        <Paper
          style={{
            padding: 10,
            marginTop: 10,
            marginBottom: 5,
            textAlign: "left",
          }}
        >
          <Grid
            container
            spacing={0}
            direction="row"
            alignItems="flex-start"
            justifyContent="flex-start"
          >
            <Grid item xs={2}>
              <img
                style={{ borderRadius: "50%" }}
                width="100%"
                src={image}
                alt=""
               />
            </Grid>

            <Grid item xs={10} style={{ paddingLeft: "2ex" }}>
              <Grid
                container
                spacing={0}
                direction="column"
                alignItems="flex-start"
                justifyContent="flex-start"
              >
                <Grid item xs={12}>
                    <Typography variant="body1">
                        {title}: {description}
                    </Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>
    )
}

export default UserGroup;