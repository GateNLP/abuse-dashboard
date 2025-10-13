import React, { Component } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";

import TweetView from "./TweetView";
import { withTranslation } from "react-i18next";
import {getISODate} from "../api";

const style = {
  padding: 8,
  marginBottom: 4,
  textAlign: "center",
  width: "calc(100% - 20px)"
};

const endpoint = ".";//process.env.REACT_APP_CONVERSATION_API

class TweetTable extends Component {
  constructor(props) {

    super(props);

    this.state = {
      items: [],
      hasMore: true,
      openUser: false,
      screenName: null,
      showOriginals: this.props.displayOptions.displayOriginal,
      showReplies: this.props.displayOptions.displayReply,
      sortOrder: this.props.sort === "0" ? "desc" : "asc"
    }

    this.initTweetList();

  }

  initTweetList = () => {

    var from = this.props.from || "";
    if (from !== "" && ((from instanceof Date) || from.indexOf("now") === -1)) from = getISODate(new Date(from));

    var to = this.props.to ||  "";
    if (to !== "" && ((to instanceof Date) || to.indexOf("now") === -1)) to = getISODate(new Date(to));

    let url = endpoint + "/tweets?"
    + "abusive=" + this.props.abusive
    + "&query=" + encodeURIComponent(this.props.query || "")
    + "&from=" + encodeURIComponent(from)
    + "&to=" + encodeURIComponent(to)
    + "&sort=" + this.props.sort
    + "&order=" + this.state.sortOrder;

  axios.post(url, this.props.filter)
    .then((response) => {
      this.setState({
        handle: response.data.handle,
        items: response.data.tweets,
        total: response.data.total,
        hasMore: response.data.tweets.length < response.data.total,
        scroll_id: response.data.scroll_id
      });
    }, (error) => {
      console.log(error)
    });
  }

  handleOpenUser = (e, screen_name) => {
    e.preventDefault();

    this.setState({
      screenName: screen_name,
    });

    this.setState({
      openUser: true
    });
  }

  handleCloseUser = () => {
    this.setState({
      openUser: false
    });
  }

  handleOriginals = (event) => {
    this.setState({...this.state, showOriginals: event.target.checked});
    this.props.displayOptions.updateOriginal(event.target.checked);
    this.fetchMoreData();
  }

  handleReplies = (event) => {
    this.setState({...this.state, showReplies: event.target.checked});
    this.props.displayOptions.updateReply(event.target.checked);
    this.fetchMoreData();
  }

  handleSortOrder = (event) => {
    // use the version of setState that takes a callback so that we can guarantee that
    // the state has been updated before we try and pull a value from it
    this.setState({...this.state, items: [], sortOrder: event.target.value}, this.initTweetList);
  }

  display = (i) => {

    if (!this.state.showOriginals && i.tweet_kind === "original") return "none";

    if (!this.state.showReplies && i.tweet_kind === "reply") return "none";


    return "block";
  }

  fetchMoreData = () => {
    if (this.state.items.length >= this.state.total) {
      this.setState({
        hasMore: false
      })

      return
    }

    axios.get(
      endpoint + "/tweets/scroll?id=" + this.state.scroll_id
    )
      .then((response) => {
        // if we didn't hit an error then set the state with the relevant data
        this.setState({
          items: this.state.items.concat(response.data),
        })

        //TODO check what the response looks like for deleted tweet? is it an error code
        //     or a success but with a deleted message in the HTML
      }, (error) => {
        // for now just log the error to the console
        console.log(error);
      });
  }

  render() {

    const { t } = this.props;

    return (

      <React.Fragment>
        {t("dashboard.tweetTable.type.label")}{" "}
        <FormControlLabel data-cy="showOriginals" control={<Checkbox onChange={this.handleOriginals} checked={this.state.showOriginals} />} label={t("dashboard.tweetTable.type.originals")} />
        <FormControlLabel data-cy="showReplies" control={<Checkbox onChange={this.handleReplies} checked={this.state.showReplies} />} label={t("dashboard.tweetTable.type.replies")} />

        <span style={{float:"right"}}><label>{t("dashboard.tweetTable.sort.label")}{" "}
          <select value={this.state.sortOrder} onChange={this.handleSortOrder}>
            <option value="desc">{t("dashboard.tweetTable.sort.desc")}</option>
            <option value="asc">{t("dashboard.tweetTable.sort.asc")}</option>
          </select></label>
        </span>

        <InfiniteScroll
            className={"data-cy-tweetTable"}
            dataLength={this.state.items.length}
            next={this.fetchMoreData}
            hasMore={this.state.hasMore}
            loader={<h4>{t("dashboard.tweetTable.loading")}</h4>}
            height={this.props.height ? this.props.height : 500}
            style={{ overflowY: "scoll", margin: "auto" }}
        >

        {this.state.items.map((i, index) => (

          <div style={{...style, display: this.display(i)}} key={index}>
            <TweetView tabs={this.props.tabs || null} data={i} sort={this.props.sort} addToQuery={this.props.addToQuery} addToReport={this.props.addToReport} />
          </div>
        ))}

      </InfiniteScroll>
      </React.Fragment>
    );
  }
}

export default  withTranslation()(TweetTable)