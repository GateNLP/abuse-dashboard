import React, { Component } from "react";

import { connect } from 'react-redux';

import axios from "axios";

import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import ConversationAPI from "../api";
import { anonymize } from "../api";

import { withTranslation } from "react-i18next";
import {withLinks} from "../linkify";
import UserMenu from "../components/buttons/UserMenu";

const conversationApi = ConversationAPI();

class User extends Component {
  constructor(props) {
    super(props);

    // set default values for the state
    this.state = {
      // TODO is there anything we need to default to?
    };
  }

  fixImage(img) {

    if (img === undefined || img === null) return;

    img = img.substring(img.indexOf(":")+1);

    fetch(img, { method: 'HEAD' })
      .then((response) => {
        console.log("fixImage");
        console.log(response);
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
    axios
      .get(
        "./user?screen_name=" +
          this.props.screen_name +
          "&date=" +
          encodeURIComponent(this.props.date?.toUTCString() || "")
      )
      .then(
        (response) => {
          // if we didn't hit an error then set the state with the relevant data
          this.setState({
            name: response.data.name,
            screen_name: response.data.screen_name,
            img: this.props.image || response.data.profile_image_url_https,//"../default_profile_normal.png",
            description: withLinks(response.data.description, response.data.platform, this.props.addToQuery),
            url: response.data.url,
            following: conversationApi.formatLargeNumber(
              response.data.friends_count
            ),
            followers: conversationApi.formatLargeNumber(
              response.data.followers_count
            ),
            tweets: conversationApi.formatLargeNumber(
              response.data.statuses_count
            ),
            lists: conversationApi.formatLargeNumber(
              response.data.listed_count
            ),
            created_at: response.data.created_at,
            account_age: response.data.account_age?.toLocaleString(),
            tweets_per_day: response.data.tweets_per_day?.toFixed(2),
            verified: response.data.verified || response.data.is_blue_verified,
            verified_type: response.data.verified_type,
            protected: response.data.protected,
            location: response.data.location,
            status: response.data.account_status,
            loaded: true,
            anonymousMode: this.props.anonymousMode,
            error: response.data.error,
            platform: response.data.platform,
            affiliated_with: response.data.affiliated_with
          });

          this.fixImage((this.props.image || response.data.profile_image_url_https)?.replace("_normal", ""));
        },
        (error) => {
          // for now just log the error to the console
          console.log(error);

          // just return an unknown user label; this should be impossible so...
          this.setState({
            name: "unknown user",
          });
        }
      );
  }

  componentDidUpdate(prevProps) {
    if (prevProps.screen_name !== this.props.screen_name) {
      this.setState({ loaded: false });
      this.getUserDetails();
    }

    if (prevProps.anonymousMode !== this.props.anonymousMode) {
      this.setState({ ...this.state, anonymousMode: this.props.anonymousMode });
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
        following: conversationApi.formatLargeNumber(
          this.props.user.friends_count
        ),
        followers: conversationApi.formatLargeNumber(
          this.props.user.followers_count
        ),
        tweets: conversationApi.formatLargeNumber(
          this.props.user.statuses_count
        ),
        lists: conversationApi.formatLargeNumber(this.props.user.listed_count),
        created_at: this.props.user.created_at,
        account_age: this.props.user.account_age.toLocaleString(),
        tweets_per_day: this.props.user.tweets_per_day.toFixed(2),
        verified: this.props.user.verified || this.props.user.is_blue_verified,
        verified_type: this.props.user.verified_type,
        protected: this.props.user.protected,
        location: this.props.user.location,
        status: this.props.user.account_status,
        loaded: true,
        anonymousMode: this.props.anonymousMode,
        platform: this.props.user.platform,
        affiliated_with: this.props.user.affiliated_with,
      });

      this.fixImage(this.props.user.profile_image_url_https?.replace("_normal", ""))

    } else {
      this.getUserDetails();
    }
  }

  anonym(str) {
    return anonymize(str, this.state.anonymousMode);
  }

  render() {
    const isLoaded = this.state.loaded;
    const { t } = this.props;

    

    if (!isLoaded) {
      return (
        <div>
          <div>{"Loading user profile..."}</div>
        </div>
      );
    }

    if (this.state.error) {
      return (
        (<Paper
          key={this.props.screen_name}
          style={{
            padding: 10,
            marginTop: 10,
            marginBottom: 5,
            textAlign: "center",
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
                src={this.state.platform === "Twitter" ? "../default_profile_normal.png" : this.state.img}
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
                  <UserMenu screen_name={this.state.screen_name} platform={this.state.platform} />
                </Grid>

                <Grid
                  item
                  xs={12}
                  style={{ textAlign: "left", paddingTop: "1ex" }}
                >
                  {this.state.error}
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>)
      );
    }

    if (this.state.status !== "active") {
      return (<Paper
          key={this.props.screen_name}
          style={{
            padding: 10,
            marginTop: 10,
            marginBottom: 5,
            textAlign: "center",
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
                src="../default_profile_normal.png"
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
                <Typography variant="body1" style={{ color: "red" }}>
                  {t("dashboard.user.compliance", {screen_name: this.anonym(this.state.screen_name), status: this.state.status})}
                  </Typography>
                  </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>)
    }

    return (
      (<Paper
        key={this.props.screen_name}
        style={{
          padding: 10,
          marginTop: 10,
          marginBottom: 5,
          textAlign: "center",
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
              style={{ borderRadius: "50%",border:`3px solid ${this.props.colors[this.state.platform]}` }}
              width="100%"
              src={this.anonym(this.state.img)}
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
                <span style={{ fontWeight: "600" }}>
                  {this.anonym(this.state.name)}
                  {this.state.verified_type === "Government" ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 22 22" aria-label="Verified account" role="img" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-bnwqim r-lrvibr r-m6rgpd r-f9ja8p r-og9te1 r-3t4u6i" data-testid="icon-verified"><g><path clip-rule="evenodd" d="M12.05 2.056c-.568-.608-1.532-.608-2.1 0l-1.393 1.49c-.284.303-.685.47-1.1.455L5.42 3.932c-.832-.028-1.514.654-1.486 1.486l.069 2.039c.014.415-.152.816-.456 1.1l-1.49 1.392c-.608.568-.608 1.533 0 2.101l1.49 1.393c.304.284.47.684.456 1.1l-.07 2.038c-.027.832.655 1.514 1.487 1.486l2.038-.069c.415-.014.816.152 1.1.455l1.392 1.49c.569.609 1.533.609 2.102 0l1.393-1.49c.283-.303.684-.47 1.099-.455l2.038.069c.832.028 1.515-.654 1.486-1.486L18 14.542c-.015-.415.152-.815.455-1.099l1.49-1.393c.608-.568.608-1.533 0-2.101l-1.49-1.393c-.303-.283-.47-.684-.455-1.1l.068-2.038c.029-.832-.654-1.514-1.486-1.486l-2.038.07c-.415.013-.816-.153-1.1-.456zm-5.817 9.367l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="#829aab" fill-rule="evenodd"></path></g></svg> : null}
                  {this.state.verified_type === "Business" ? <svg style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }} viewBox="0 0 22 22" aria-label="Verified account" role="img" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-bnwqim r-lrvibr r-m6rgpd r-f9ja8p r-og9te1 r-3t4u6i" data-testid="icon-verified"><g><linearGradient gradientUnits="userSpaceOnUse" id="43-a" x1="4.411" x2="18.083" y1="2.495" y2="21.508"><stop offset="0" stop-color="#f4e72a"></stop><stop offset=".539" stop-color="#cd8105"></stop><stop offset=".68" stop-color="#cb7b00"></stop><stop offset="1" stop-color="#f4ec26"></stop><stop offset="1" stop-color="#f4e72a"></stop></linearGradient><linearGradient gradientUnits="userSpaceOnUse" id="43-b" x1="5.355" x2="16.361" y1="3.395" y2="19.133"><stop offset="0" stop-color="#f9e87f"></stop><stop offset=".406" stop-color="#e2b719"></stop><stop offset=".989" stop-color="#e2b719"></stop></linearGradient><g clip-rule="evenodd" fill-rule="evenodd"><path d="M13.324 3.848L11 1.6 8.676 3.848l-3.201-.453-.559 3.184L2.06 8.095 3.48 11l-1.42 2.904 2.856 1.516.559 3.184 3.201-.452L11 20.4l2.324-2.248 3.201.452.559-3.184 2.856-1.516L18.52 11l1.42-2.905-2.856-1.516-.559-3.184zm-7.09 7.575l3.428 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#43-a)"></path><path d="M13.101 4.533L11 2.5 8.899 4.533l-2.895-.41-.505 2.88-2.583 1.37L4.2 11l-1.284 2.627 2.583 1.37.505 2.88 2.895-.41L11 19.5l2.101-2.033 2.895.41.505-2.88 2.583-1.37L17.8 11l1.284-2.627-2.583-1.37-.505-2.88zm-6.868 6.89l3.429 3.428 5.683-6.206-1.347-1.247-4.4 4.795-2.072-2.072z" fill="url(#43-b)"></path><path d="M6.233 11.423l3.429 3.428 5.65-6.17.038-.033-.005 1.398-5.683 6.206-3.429-3.429-.003-1.405.005.003z" fill="#d18800"></path></g></g></svg> : null}
                  {this.state.verified ? (
                    <svg
                      style={{
                        paddingLeft: "0.25em",
                        height: "1.25em",
                        verticalAlign: "text-bottom",
                      }}
                      viewBox="0 0 24 24"
                    >
                      <g>
                        <path
                          d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"
                          style={{ fill: "#1da1f2", fillOpacity: 1 }}
                        />
                      </g>
                    </svg>
                  ) : null}
                  {this.state.affiliated_with?.badge?.url ? <img alt={this.state.affiliated_with.description} title={this.state.affiliated_with.description} src={this.state.affiliated_with.badge.url} style={{ paddingLeft: "0.25em", height: "1.25em", verticalAlign: "text-bottom" }}/>:null}
                  {this.state.protected ? (
                    <svg
                      style={{
                        paddingLeft: "0.25em",
                        height: "1.25em",
                        verticalAlign: "text-bottom",
                      }}
                      viewBox="0 0 24 24"
                    >
                      <g>
                        <path d="M19.75 7.31h-1.88c-.19-3.08-2.746-5.526-5.87-5.526S6.32 4.232 6.13 7.31H4.25C3.01 7.31 2 8.317 2 9.56v10.23c0 1.24 1.01 2.25 2.25 2.25h15.5c1.24 0 2.25-1.01 2.25-2.25V9.56c0-1.242-1.01-2.25-2.25-2.25zm-7 8.377v1.396c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-1.396c-.764-.3-1.307-1.04-1.307-1.91 0-1.137.92-2.058 2.057-2.058 1.136 0 2.057.92 2.057 2.056 0 .87-.543 1.61-1.307 1.91zM7.648 7.31C7.838 5.06 9.705 3.284 12 3.284s4.163 1.777 4.352 4.023H7.648z"></path>
                      </g>
                    </svg>
                  ) : null}
                </span>
              </Grid>

              <Grid item xs={12}>
                <UserMenu screen_name={this.state.screen_name} platform={this.state.platform} />
              </Grid>

              <Grid
                item
                xs={12}
                style={{
                  textAlign: "left",
                  paddingTop: "1ex",
                  hyphens: "auto",
                  overflowWrap: "anywhere",
                }}
              >
                {this.state.description}
              </Grid>

              {(this.state.platform === "Twitter" || this.state.platform === "Mastodon") && <React.Fragment>

              <Grid
                item
                xs={12}
                style={{ textAlign: "center", paddingTop: "1ex" }}
              >
                <Typography variant="body1" style={{ fontSize: "80%" }}>{t("dashboard.user.overview", {platform: this.state.platform, createdAt: this.state.created_at, accountAge: this.state.account_age})}</Typography>
              </Grid>

              <Grid
                item
                xs={12}
                style={{ textAlign: "center", paddingTop: "1ex" }}
              >
                <Typography variant="body1" style={{ fontSize: "80%" }}>
                  {this.state.following} {t("dashboard.user.following")},{" "}
                  {this.state.followers} {t("dashboard.user.followers")}
                </Typography>
              </Grid>

              {this.state.status !== "active" ? (
                <Grid
                  item
                  xs={12}
                  style={{ textAlign: "center", paddingTop: "1ex" }}
                >
                  <Typography variant="body1" style={{ color: "red" }}>
                    {t("dashboard.user.status", {status: this.state.status})}
                  </Typography>
                </Grid>
              ) : (
                ""
              )}

              </React.Fragment>}
            </Grid>

            
          </Grid>
        </Grid>
      </Paper>)
    );
  }
}

const mapStateToProps = function(state) {
  return {
    colors: state.dashboard.location?.colors
  }
}

export default connect(mapStateToProps)(withTranslation()(User));
