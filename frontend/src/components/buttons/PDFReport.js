import Link from "@mui/material/Link";
import NoteAdd from "@mui/icons-material/NoteAdd";

import { getBlob } from "./SVGDownload";

import { withTranslation } from "react-i18next";

const PDFReport = (props) => {

    const { t } = props

    function collectInfo(e) {
        e.preventDefault();

        // this means we default to viz while we fix everything we
        // had already added to the dashboard
        const itemType = props.type || "viz"

        if (itemType === "viz") {
            props.addToReport(itemType, {
                title: props.title,
                table: props.data || null,
                image: getBlob(props.id, props.fill, props.fixBBox || true)
            });
        }

        if (itemType === "post") {
            props.addToReport(itemType, {
                title: t("components.pdfReport.post", {platform: props.data.platform, account: props.data.user.screen_name, time:props.data.created_at_time}),
                post: props.data
            })
        }

        if (itemType === "text") {
            props.addToReport(itemType, {
                title: props.title,
                lines: props.lines
            })
        }

        if (itemType === "table") {
            props.addToReport(itemType, {
                title: props.title,
                table: {
                    headings: props.headings,
                    render: props.render,
                    rows: props.rows
                }
            })
        }
    }

    return (
        (<Link
            href="#"
            onClick={(e) => { collectInfo(e) }}
            title={t("components.pdfReport.title")}
            underline="hover"><NoteAdd style={{ verticalAlign: "middle" }} /></Link>)
    );
}

export default withTranslation()(PDFReport);