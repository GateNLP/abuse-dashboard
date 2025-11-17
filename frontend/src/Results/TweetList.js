import React, { Component } from "react";
import InfiniteScroll from "react-infinite-scroll-component";
import axios from "axios";
import CategorisedTweet from "./CategorisedTweet"

const style = {
  padding: 8,
  marginBottom: 4,
  textAlign: "center",
  width: "calc(100% - 20px)"
};

const endpoint = ".";//process.env.REACT_APP_CONVERSATION_API

class TweetList extends Component {
    constructor(props) {
        super(props);

        if (props.conversation) {
            // set default values for the state
            this.state = {
                items: props.conversation.direct_replies,
                hasMore: props.conversation.direct_replies.length < props.conversation.number_of_replies,
                scroll_id: props.conversation.scroll_id,
                total: this.props.conversation.number_of_replies
            }
        }
        else {
            this.state = {
                items: [],
                hasMore: true
            }

            let url = endpoint+"/replies?id="+this.props.id_str+"&categories="+this.props.stance+"&restrict="+this.props.restrict;

            // TODO I think these will need URL encoding to be 100% safe

            if (this.props.screen_name) {
                url = url + "&screen_name="+this.props.screen_name;
            }

            if (this.props.hashtag) {
                url = url + "&hashtag="+this.props.hashtag;
            }
            
            axios.get (url)
            .then((response) => {
                this.setState({
                    items: response.data.replies,
                    total: response.data.total,
                    hasMore: response.data.replies.length < response.data.total,
                    scroll_id: response.data.scroll_id
                });
            }, (error) => {
                console.log(error)
            });
        }
    }

    fetchMoreData = () => {
        
        if (this.state.items.length >= this.state.total) {
            this.setState({
                hasMore: false
            })

            return
        }

        axios.get(
            endpoint+"/replies/scroll?id="+this.state.scroll_id
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

        return (
            <InfiniteScroll
                dataLength={this.state.items.length}
                next={this.fetchMoreData}
                hasMore={this.state.hasMore}
                loader={<h4>{this.props.keyword("dashboard.conversation.tweets_loading")}</h4>}
                height={this.props.height ? this.props.height : 500}
                endMessage={
                    <p style={{ textAlign: "center" }}>
                    <b>{this.props.keyword("dashboard.conversation.tweets_all")}</b>
                    </p>
                }
                style={{maxWidth:"575px", overflowY:"scoll", margin: "auto"}}>
            
                {this.state.items.map((i, index) => (    
                    <div style={style} key={index}>
                        <CategorisedTweet addToReport={this.props.addToReport} addToQuery={this.props.addToQuery} tabs={this.props.tabs} data={i} category={this.props.keyword("dashboard.overview.abuse_types."+i.category)} />
                    </div>
                ))}
            </InfiniteScroll>
        );
    }
}

export default TweetList
