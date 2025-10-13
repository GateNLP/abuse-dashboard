import Link from "@mui/material/Link";

import DownloadIcon from "@mui/icons-material/SaveAlt";
import React from "react";
import {useSelector} from "react-redux";

import {getISODate, getPostLink} from "../../api"

import { useTranslation } from 'react-i18next';

const CSVDownload = ({method, filename}) => {

    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    const user = useSelector(state => state.dashboard.user);
    const overview = useSelector(state => state.dashboard.overview);

    const formatDate = (date)=>{
        return getISODate(date).replace(/[.,:]/g, '-');
    }

    const generateFilename = (filename, type) => {
        let file_name = [user.id, formatDate(overview.from), formatDate(overview.to), filename]
        file_name = encodeURIComponent(file_name.join("_"))
        return file_name + "." + type
    }

    return (
        (<Link
            title={t("dashboard.download.csv")}
            download={generateFilename(filename, "csv")}
            href={"data:text/csv;charset=utf-8," + encodeURIComponent(method)}
            underline="hover">
            <DownloadIcon style={{verticalAlign: "middle"}}/>
        </Link>)
    );
}

export default CSVDownload;

export const convertDistToCsv = (dist, headings) => {
    let final_str = headings.join(",") + "\n"

    dist.forEach(plot => {
        plot.x.forEach((date, index) =>
            final_str += [plot.name, date, plot.y[index]].join(",") + "\n"
        )
    })

    return final_str
}

export const convertObjToCsv = (obj, headings) => {
    headings = headings.join(",") + "\n"
    // separate keys and values with a comma, replace any _ with a space, then join each row with new line
    return headings + Object.entries(obj).map(k => {return k.join(",")}).map(k=>k.replace(/_/g, ' ')).join("\n");}

export const convertMultiObjToCsv = (object1, object2, headings) => {
    let object_to_use = object1
    let final_string = headings.join(",") + "\n"

    Object.keys(object_to_use).forEach(key => {
        final_string = final_string + [key, object1[key], object2[key]].join(",") + "\n"
    })

    return final_string
}

export const convertHeatmapToCsv = (heatmap) => {

    let final_string = ","+heatmap.x.join(",")+"\n";

    for (var row = 0 ; row < heatmap.y.length ; ++row) {
        final_string = final_string+heatmap.y[row]+","+heatmap.z[row].join(",")+"\n";
    }

    return final_string;
}

export const convertStringTopicsToCsv = (topics) => {
    let headings = new Set(Object.values(topics).flatMap(topic => Object.keys(topic)).sort())
    let final_str = ""

    Object.entries(topics).forEach(str => {
        let abuse_string = str[0]
        let topics = str[1]
        let topic_string = abuse_string + ","

        headings.forEach(heading => {
            let count = topics[heading] ? topics[heading] + "," : "0,"
            topic_string += count
        })

        final_str += topic_string.replace(/.$/,"\n")
    })

    final_str = "abuse phrase," + [...headings].map(heading=>heading.replace(/_/g," ")).join(",") + "\n" + final_str
    return final_str
}

export const convertTimeHistogramToCsv = (data, sbinx, headings) => {
    headings = headings.join(",") + "\n"

    let final_str = ""
    let sbinx_range = [...Array(sbinx).keys()]

    sbinx_range.forEach(bin=>{
        final_str = final_str + bin + "," + data.filter(k=>k===bin).length + "\n"
    })

    return headings + final_str
}

export const convertSunburstToCsv = (data, headings) => {
    let final_str = headings.join(",") + "\n"

    data.labels.forEach((label,index)=>{
        let parent_label = handleLabel(data.labels[data.ids.indexOf(data.parents[index])])
        final_str += [handleLabel(label), parent_label, data.values[index]].join(",") + "\n"
    })
    return final_str
}

export const convertTriggersToCSV = (data) => {
    let final_str = ["Post URL", "Posted At", "All Replies", "Abusive Replies", "% Abuse", "Seconds to First Abusive Reply"].join(",")+"\n"

    data.forEach((tweet) => {
        final_str += [
            getPostLink({platform: tweet.platform, id: tweet.id_str, user: {screen_name: tweet.screen_name}}),
            tweet.createdAt !== "" ? "\""+(new Date(tweet.createdAt)).toLocaleString()+"\"" : "",
            tweet.total,
            tweet.unique,
            tweet.percentage.toFixed(2),
            tweet.timeToAbuse
        ].join(",")+"\n"
    })

    return final_str;
}

function handleLabel(label) {
    return label === undefined ? "none" : label.replace(/,/g, " ");
}
