import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import { styled } from '@mui/material/styles';

import UserMenu from "./components/buttons/UserMenu";

const processString = require("react-process-string");

const LinkifiedBox = styled(Box)({
    "& > p:first-of-type": {
        marginTop: 0
    },
    "& > p:last-of-type": {
        marginBottom: 0
    }
});

const genericUrl = {
    regex: /(https?:\/\/(www\.)?[a-zA-Z0-9@:%._+~#=]{1,256}\.[a-z]{2,6}\b(?:[-a-zA-Z0-9%_+.~#?&@\/=]*[a-zA-Z0-9%_+~#@\/=])?)/gim, //regex to match a URL
    fn: (key, result) => {
        let url = result[1];

        return (
            (<Link key={key} href={url} target="_blank" underline="hover">
                {url}
            </Link>)
        );
    },
};

// replace line break with <br> - consecutive line breaks will already have been
// converted to paragraphs
const lineBreak = {
    regex: /\n+/g, // regex to match any remaining newlines
    fn: (key, result) => <br/>,
};


function createConfig(platform, addToQuery, openUser = null, tabs = null) {
    
    if (platform === "Twitter")
        return [
            {
                regex: /(?<=^|\s)@([a-zA-Z0-9_]+)/gim, //regex to match a username
                fn: (key, result) => {
                    let username = result[1];

                    /*return (
                        <Link
                            key={key}
                            href={getAccountLink('Twitter', username)}
                            target="_blank"
                        >
                            @{username}
                        </Link>
                    );*/
                    return (
                        <UserMenu key={key} platform="Twitter" tabs={tabs} screen_name={username} addToQuery={addToQuery} viewUser={openUser}>@{username}</UserMenu>
                    )
                },
            },
            {
                regex: /(?<=^|\s)[#\uFF03]([\p{L}\p{N}_]+)/gimu, //regex to match a hashtag
                fn: (key, result) => {
                    let hashtag = result[1];

                    return (
                        (<Link
                            key={key}
                            href={`https://twitter.com/hashtag/${hashtag}?f=live`}
                            target="_blank"
                            underline="hover">#{hashtag}
                        </Link>)
                    );
                },
            },
            genericUrl,
            lineBreak,
        ];

    if (platform === "Telegram")
        return [
            {
                regex: /(?<=^|\s)@([a-zA-Z0-9_]+)/gim, //regex to match a username
                fn: (key, result) => {
                    let username = result[1];

                    /*return (
                        <Link
                            key={key}
                            href={getAccountLink('Telegram', username)}
                            target="_blank"
                        >
                            @{username}
                        </Link>
                    );*/

                    return (
                        <UserMenu key={key} tabs={tabs} platform="Telegram" screen_name={username} addToQuery={addToQuery} viewUser={openUser}>@{username}</UserMenu>
                    )
                },
            },
            // telegram doesn't have a way to search globally for hashtags - even if you
            // do a "global search" in your telegram client it only finds matches within the channels
            // and groups that you are subscribed to
            genericUrl,
            lineBreak,
        ];

    if (platform === "YouTube")
        return [
            {
                // YouTube usernames can include dots and dashes, their guidelines are not clear about
                // whether they can _end_ with a dot or dash but I've disallowed that in this regex so
                // it doesn't get confused by a username at the end of a sentence.
                regex: /(?<=^|\s)@([a-zA-Z0-9_.-]*[a-zA-Z0-9_])/gim,
                fn: (key, result) => {
                    let username = result[1];

                    /*return (
                        <Link
                            key={key}
                            href={getAccountLink('YouTube', username)}
                            target="_blank"
                        >
                            @{username}
                        </Link>
                    );*/
                    return (
                        <UserMenu key={key} tabs={tabs} platform="YouTube" screen_name={username} addToQuery={addToQuery} viewUser={openUser}>@{username}</UserMenu>
                    )
                },
            },
            {
                regex: /(?<=^|\s)[#\uFF03]([\p{L}\p{N}_]+)/gimu, //regex to match a hashtag
                fn: (key, result) => {
                    let hashtag = result[1];

                    return (
                        (<Link
                            key={key}
                            href={`https://youtube.com/hashtag/${hashtag}`}
                            target="_blank"
                            underline="hover">#{hashtag}
                        </Link>)
                    );
                },
            },
            genericUrl,
            lineBreak,
        ];

    if (platform === "Mastodon")
        return [
            {
                //regex to match a username including server (@someone@mas.to) - the username part must be letters,
                // numbers and underscore only, the server part can have dots and hyphens as well as it's a
                // normal internet hostname.
                regex: /(?<=^|\s)@([a-zA-Z0-9_]+@[a-zA-Z0-9._-]+)/gim,
                fn: (key, result) => {
                    let username = result[1];

                    /*return (
                        <Link
                            key={key}
                            href={getAccountLink('Mastodon', username)}
                            target="_blank"
                        >
                            @{username}
                        </Link>
                    );*/

                    return (
                        <UserMenu key={key} tabs={tabs} platform="Mastodon" screen_name={username} addToQuery={addToQuery} viewUser={openUser}>@{username}</UserMenu>
                    )
                },
            },
            {
                regex: /(?<=^|\s)[#\uFF03]([\p{L}\p{N}_]+)/gimu, //regex to match a hashtag
                fn: (key, result) => {
                    let hashtag = result[1];

                    // for the moment all hashtags link to mastodon.social - should the server
                    // be a parameter instead, so we link to the relevant server for a user?
                    return (
                        (<Link
                            key={key}
                            href={`https://mastodon.social/tags/${hashtag}`}
                            target="_blank"
                            underline="hover">#{hashtag}
                        </Link>)
                    );
                },
            },
            genericUrl,
            lineBreak,
        ];
    
    return null;
}

export function withLinks(text, platform = "Twitter", addToQuery, openUser = null, tabs = null) {

    if (text === undefined || text === null) return "";

    const platformConfig = createConfig(platform, addToQuery, openUser, tabs);

    if(platformConfig) {
        const processFn = processString(platformConfig);
        return (
            // first split into paragraphs at two-or-more newlines, then process each paragraph
            (<LinkifiedBox>
                {text.trim().split(/\n\n+/g).map((para, key) => <p key={key}>{processFn(para)}</p>)}
            </LinkifiedBox>)
        );
    } else {
        return text;
    }
}