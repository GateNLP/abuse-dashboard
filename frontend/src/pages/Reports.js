import React from "react";

import Grid from "@mui/material/Grid";
import Link from "@mui/material/Link";
import Paper from '@mui/material/Paper';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import Typography from "@mui/material/Typography";
import TextareaAutosize from "@mui/material/TextareaAutosize"
import { TextField } from "@mui/material";
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';

import useMyStyles from "../MaterialUiStyles/useMyStyles";

import { useTranslation, Trans } from 'react-i18next';

import { useSelector } from "react-redux";

import NoteAdd from "@mui/icons-material/NoteAdd";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from "@mui/icons-material/Edit";
import PhotoCamera from "@mui/icons-material/PhotoCamera";
import ArrowDropUp from "@mui/icons-material/ArrowDropUp";
import ArrowDropDown from "@mui/icons-material/ArrowDropDown";

import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableRow from '@mui/material/TableRow';

import { Document, Page, Text, StyleSheet, Font, Image, pdf, Link as PDFLink, View } from '@react-pdf/renderer';
import { Table as PDFTable, TR, TH, TD } from '@ag-media/react-pdf-table';
import PictureAsPdf from "@mui/icons-material/PictureAsPdf";

import { getPostLink, getAccountLink } from "../api";

import _ from 'lodash';

const Reports = (props) => {

    const classes = useMyStyles();

    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    const intlLangs = new Intl.DisplayNames([i18n?.language || "en"], { type: 'language' });

    const countryNames = new Intl.DisplayNames([i18n?.language || "en"], { type: 'region' });

    function getCountryName(countryCode) {
        try {
            return countryNames.of(countryCode)
        } catch {
            return "UNKNOWN ("+countryCode+")"
        }
    }

    const [itemBeingEdited, setItemBeingEdited] = React.useState(null);

    const [itemComment, setItemComment] = React.useState("");
    const [itemTitle, setItemTitle] = React.useState("");
    const [itemImages, setItemImages] = React.useState([]);

    const sources = useSelector(state => state.dashboard.sources);

    function getSource(orig) {
        for (var i = 0 ; i < sources.length ; ++i) {
            if (sources[i].orig === orig) return sources[i];
        }

        return {}
    }

    function describeLanguage(lang) {

        var key = "dashboard.lang." + lang;

        if (i18n.exists(key)) return t(key);

        return intlLangs.of(lang);
    }

    function swapItems(e, i1, i2) {
        e?.preventDefault();

        var copy = [...props.items];
        // I love how I can swap two array elements in a single line
        // no idea how it actually works though :P
        [copy[i1], copy[i2]] = [copy[i2], copy[i1]]

        props.setItems(copy);
    }

    function deleteItem(e, i) {
        e?.preventDefault();

        const filtered = props.items.filter((value, index, arr) => {
            return (index !== i);
        });

        props.setItems(filtered);
    }

    function openEditDialog(e, i) {
        e?.preventDefault();

        if (i === -1) {
            setItemComment("");
            setItemTitle("");
            setItemImages([]);
        } else {
            setItemComment(props.items[i].comment || "")
            setItemTitle(props.items[i].data.title || "")
            setItemImages(props.items[i].images || [])
        }

        setItemBeingEdited(i);
    }

    function closeEditDialog(event, reason) {

        if (reason === "escapeKeyDown") {
            setItemBeingEdited(null);
            return;
        }
        
        if (itemTitle.trim() === "") return;

        if (itemBeingEdited === -1) {
            props.addToReport("note", {
                title: itemTitle  
            })

            props.items[props.items.length-1].comment = itemComment;
            props.items[props.items.length-1].images = itemImages;
            props.setItems(props.items);
        } else {
            props.items[itemBeingEdited].comment = itemComment;
            props.items[itemBeingEdited].data.title = itemTitle;
            props.items[itemBeingEdited].images = itemImages;
            props.setItems(props.items);
        }

        setItemBeingEdited(null);
    }

    function addNewItem(e) {
        
        /*props.addToReport("note", {
            // just leave it empty and the editor will take care
            // of filling in the details
        })*/

        openEditDialog(e, -1);


    }

    function loadImages(e) {

        // whilst this should loop around and add each selected image in turn
        // the effect is we only get one new image added to the list. I think
        // this is happening because the events are all happening at the same
        // time to itemImages isn't being updated fast enough between each go
        // around the loop and so only the last one (probably) actually has
        // an effect.

        // while I try and figure out a better solution, the easy "fix" is to
        // limit the file picker to a single file

        for (var i = 0 ; i < e.target.files.length ; ++i) {

            var file = e.target.files[i];

            const reader = new FileReader();

            reader.addEventListener("load",
                () => {
                    setItemImages([...itemImages, reader.result])
                },
                false
            );

            reader.readAsDataURL(file);

        }
    }

    function deleteImage(image) {
        const updated = [];

        for (var i = 0 ; i < itemImages.length ; ++i) {
            if (i !== image) updated.push(itemImages[i])
        }

        setItemImages(updated);
    }

    const user = useSelector(state => state.dashboard.user);
    const location = useSelector(state => state.dashboard.location)
    const platforms = useSelector(state => state.dashboard.platforms);

    Font.register({
        family: 'Oswald',
        src: 'https://fonts.gstatic.com/s/oswald/v13/Y_TKV6o8WovbUd3m_X9aAA.ttf'
    });

    Font.registerEmojiSource({
        format: 'png',
        url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/',
    });

    const styles = StyleSheet.create({
        body: {
            paddingTop: 35,
            paddingBottom: 65,
            paddingHorizontal: 35,
        },
        title: {
            fontSize: 24,
            textAlign: 'center',
            fontFamily: 'Oswald'
        },
        author: {
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 40,
        },
        subtitle: {
            fontSize: 18,
            margin: 12,
            fontFamily: 'Oswald'
        },
        heading: {
            fontSize: 16,
            margin: 12,
            marginBottom: 0,
            fontFamily: 'Oswald'
        },
        text: {
            marginHorizontal: 12,
            marginVertical: 5,
            fontSize: 12,
            textAlign: 'justify',
            fontFamily: 'Times-Roman'
        },
        comment: {
            margin: 12,
            marginTop: 0,
            fontSize: 10,
            textAlign: 'justify',
            fontFamily: 'Times-Roman',
            color: "grey"
        },
        image: {
            marginVertical: 15,
            marginHorizontal: 100,
        },
        header: {
            fontSize: 12,
            marginBottom: 20,
            textAlign: 'center',
            color: 'grey',
        },
        pageNumber: {
            position: 'absolute',
            fontSize: 12,
            bottom: 30,
            left: 0,
            right: 0,
            textAlign: 'center',
            color: 'grey',
        },
        td: {
            fontSize: 12,
            textAlign: 'justify',
            fontFamily: 'Times-Roman'
        },

        section: {
            backgroundColor: 'silver',
            paddingBottom: 10,
        },
        li: {
            marginLeft: 24,
            fontSize: 12,
            textAlign: 'justify',
            fontFamily: 'Times-Roman'
        }
    });

    function addFilterToPDF(i) {

        if (i > 0 && _.isEqual(props.items[i - 1].filter, props.items[i].filter)) return

        const filter = props.items[i].filter;

        const further = [];

        if (filter.query?.trim().length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.query", {query: filter.query})}</Text>)
        }

        if (filter.authors?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.postedBy", {accounts: 
                filter.authors.map((author, i) => (i > 0 ? ", " : "") + author)
            })}</Text>);
        }

        if (filter.mentions?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.mention", {accounts:
                filter.mentions.map((mention, i) => (i > 0 ? ", " : "") + mention)
            })}</Text>);
        }

        if (filter.inReplyTo?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.inReplyTo", {accounts:
                filter.inReplyTo.map((account, i) => (i > 0 ? ", " : "") + account)
            })}</Text>);
        }

        if (filter.accountTypes?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.associated", {types:
                filter.accountTypes.map((atype, i) => (i > 0 ? ", ": "") + atype)
            })}</Text>)
        }

        if (filter.hashtags?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.hashtags", {hashtags:
                filter.hashtags.map((hashtag, i) => (i > 0 ? ", " : "") + hashtag)
            })}</Text>);
        }

        if (filter.languages?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.languages", {languages:
                filter.languages.map((language, i) => (i > 0 ? ", " : "") + describeLanguage(language))
            })}</Text>);
        }

        if (filter.countries?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.countries", {countries:
                filter.countries.map((country, i) => (i > 0 ? ", " : "") + getCountryName(country))
            })}</Text>);
        }

        if (filter.users?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.relatedTo", {accounts:
                filter.users.map((user, i) => (i > 0 ? ", " : "") + location.users[user].name + " (" + location.users[user].platform + ")")
            })}</Text>);
        }

        if (filter.platforms?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.platforms", {platforms:
                filter.platforms.map((platform, i) => (i > 0 ? ", " : "") + platform)
            })}</Text>);
        }

        if (filter.abuseTypes?.terms?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.abuseTypes", {mode: filter.abuseTypes.mode, types:
                filter.abuseTypes.terms.map((abuseType, i) => (i > 0 ? ", " : "") + abuseType)
            })}</Text>)
        }

        if (filter.topics?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.topics", {topics:
                filter.topics.map((topic, i) => (i> 0 ? ", " : "") +t("dashboard.overview.topics."+topic))
            })}</Text>)
        }

        if (filter.sources?.length > 0) {
            further.push(<Text style={styles.li}>{t("dashboard.reports.filter.sources", {sources:
                filter.sources.map((source, i) => (i> 0 ? ", " : "") +getSource(source).text)
            })}</Text>)
        }

        // need to deal with if the abuse is in original/translations
        return (
            <View style={styles.section}><Text style={{ ...styles.subtitle, marginBottom: 5 }}>{t("dashboard.reports.filter.dates", {from: filter.from.toLocaleDateString(), to: filter.to.toLocaleDateString()})}</Text>
                {further.length > 0 && <View><Text style={{ ...styles.text, marginBottom: 0 }}>{t("dashboard.reports.filter.restrictions")}</Text> {further.map(item => item)}</View>}
            </View>
        )
    }

    function vizToPDF(item) {

        var data = item.data

        return (
            <View wrap={false}>
                {data.title !== null && <Text style={styles.heading}>{data.title}</Text>}

                {
                    data.table !== null && <PDFTable tdStyle={{ border: "none" }}><TR>
                        <TD weighting="0.60"><Image src={data.image} /></TD>
                        <TD weighting="0.40">
                            <PDFTable tdStyle={styles.td}>
                                <TH>
                                    {data.table.headings.map(key => {
                                        return (<TD>{key}</TD>)
                                    })}
                                </TH>
                                {Object.keys(data.table.rows).slice(0, 5).map(key => {
                                    return (
                                        <TR><TD>{key}</TD><TD>{data.table.rows[key]}</TD></TR>
                                    )
                                })}
                            </PDFTable>

                        </TD>

                    </TR></PDFTable>
                }

                {data.table === null && <Image src={data.image} />}

                {item.comment !== null && item.comment !== "" && <Text style={styles.comment}>{item.comment}</Text>}
                <View style={{...styles.text, paddingLeft: 20, marginVertical: 0, display:"flex", flexDirection: "row", flexWrap: "wrap"}}>
                {item.images.map((img, index) => {
                    return (<Image style={{width: Math.max(25, 100/item.images.length)+"%", objectFit: 'scale-down', padding: 2}} src={img}/>)
                })}
                </View>
            </View>
        )
    }

    function postToPDF(item) {
        var post = item.data.post

        return (
            <View wrap={false}>
                <Text style={styles.heading}><Trans i18nKey="dashboard.reports.postBy"
                    values={{
                        platform: post.platform,
                        user: post.user.screen_name || "Unknown User",
                        time: post.created_at_time
                    }}
                    components={{
                        1: <PDFLink src={getAccountLink(post.platform, post.user.screen_name)} />,
                        2: <PDFLink src={getPostLink(post)}/>
                    }}/></Text>
                <Text style={{ ...styles.text, paddingLeft: 20 }}>{post.text}</Text>

                <View style={{...styles.text, paddingLeft: 20, marginVertical: 0, display:"flex", flexDirection: "row"}}>
                {post.images.map((img, index) => {
                    return (<PDFLink style={{width: "25%", objectFit: 'scale-down', padding: 2}} src={img}><Image src={img}/></PDFLink>)
                })}
                </View>

                {item.comment !== null && item.comment !== "" && <Text style={styles.comment}>{item.comment}</Text>}
                <View style={{...styles.text, paddingLeft: 20, marginVertical: 0, display:"flex", flexDirection: "row", flexWrap: "wrap"}}>
                {item.images.map((img, index) => {
                    return (<Image style={{width: Math.max(25, 100/item.images.length)+"%", objectFit: 'scale-down', padding: 2}} src={img}/>)
                })}
                </View>
            </View>
        )
    }

    function textToPDF(item) {
        return (
            <View wrap={false}>
                <Text style={styles.heading}>{item.data.title}</Text>
                {item.data.lines.map((line) => {
                    if (line.startsWith("<li>"))
                        return (<Text style={styles.li}>{line.substring(4)}</Text>)

                    return (<Text style={styles.text}>{line}</Text>)
                })}

                {item.comment !== null && item.comment !== "" && <Text style={styles.comment}>{item.comment}</Text>}
                <View style={{...styles.text, paddingLeft: 20, marginVertical: 0, display:"flex", flexDirection: "row", flexWrap: "wrap"}}>
                {item.images.map((img, index) => {
                    return (<Image style={{width: Math.max(25, 100/item.images.length)+"%", objectFit: 'scale-down', padding: 2}} src={img}/>)
                })}
                </View>
            </View>
        )
    }

    function noteToPDF(item) {
        return (
            <View wrap={false}>
                <Text style={styles.heading}>{item.data.title}</Text>
                <Text style={styles.text}>{item.comment}</Text>
                <View style={{...styles.text, paddingLeft: 20, marginVertical: 0, display:"flex", flexDirection: "row", flexWrap: "wrap"}}>
                {item.images.map((img, index) => {
                    return (<Image style={{width: Math.max(25, 100/item.images.length)+"%", objectFit: 'scale-down', padding: 2}} src={img}/>)
                })}
                </View>
            </View>
        )
    }

    function tableToPDF(item) {

        const table = item.data.table

        return (
            <View wrap={false}>
                <Text style={styles.heading}>{item.data.title}</Text>
                <PDFTable tdStyle={styles.td} style={{paddingLeft: 20}}>
                    <TH>
                        {table.headings.map(key => {
                            return (<TD>{key}</TD>)
                        })}
                    </TH>

                    {table.rows.map(row => {
                        return (<TR>
                            {table.headings.map((heading, col) => {
                                return (<TD>{table.render(row, col)}</TD>)
                            })}
                        </TR>)
                    })}
                    
                </PDFTable>
            </View>
        )
    }


    function reset(e) {
        e.preventDefault();

        props.setItems([]);
    }

    async function downloadPDF(e) {
        e.preventDefault();

        const alink = document.createElement('a');
        alink.id = 'fakePDFDownload';

        var url = await pdf(<Document>
            <Page style={styles.body}>
                <Text style={styles.title}>{t("dashboard.reports.reportFor", {name: user.name})}</Text>

                <Text style={styles.text}><Trans i18nKey="dashboard.safety"
                    components={{
                        1: <PDFLink src="https://onlineviolenceresponsehub.org/"/>
                    }}/></Text>

                {props.items.map((item, index) => {

                    return (
                        <View>
                            {addFilterToPDF(index)}

                            {item.type === "viz" && vizToPDF(item)}
                            {item.type === "post" && postToPDF(item)}
                            {item.type === "text" && textToPDF(item)}
                            {item.type === "table" && tableToPDF(item)}
                            {item.type === "note" && noteToPDF(item)}
                        </View>
                    )
                })}

            </Page>
        </Document>).toBlob();

        alink.href = window.URL.createObjectURL(url);
        alink.download = "Report for " + user.name + ".pdf";

        alink.click();

        alink.remove();

        // and expire the final object URL in 60 seconds, to give it plenty of time to be
        // downloaded
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    }


    return (
        (<Box mt={3}>
            <Grid component={Paper}
                container
                direction="row"
                p={2}
                data-cy="overviewSummary"
                alignItems="flex-start">
                <Grid p={2} item xs={12}>
                    <Button disabled={props.items.length === 0} variant="contained" color="primary" onClick={(e) => { downloadPDF(e) }} style={{ float: "left" }}><PictureAsPdf /> {t("dashboard.reports.download")}</Button>
                    <span style={{ float: "right" }}>
                        <Button variant="contained" color="primary" style={{marginRight: "1em"}} onClick={(e) => { addNewItem(e)}}><NoteAdd /> {t("dashboard.reports.addNote")}</Button>
                        <Button disabled={props.items.length === 0} variant="contained" color="secondary" onClick={(e) => reset(e)}><DeleteIcon /> {t("dashboard.reports.deleteAll")}</Button>
                    </span>
                </Grid>

                {props.items.length === 0 && <Grid item xs={12}>
                    <Typography variant={"body1"}><Trans i18nKey="dashboard.reports.noItems"
                        components={{
                            1: <NoteAdd style={{ verticalAlign: "middle" }} />
                        }}/></Typography>
                </Grid>}

                {props.items.length > 0 && <Grid item xs={12}>
                    <Typography paragraph variant={"body1"}>{t("dashboard.reports.someItems")}</Typography>

                    <TableContainer component={Paper} size="small" style={{ width: "97%" }}>
                        <Table className={classes.table}>
                            <TableBody>
                                {props.items.map((item, index) => {

                                    const row = (
                                        <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                            <TableCell style={{ width: "0.5em" }}><Link
                                                title={t("dashboard.reports.editItem")}
                                                component="button"
                                                onClick={(e) => { openEditDialog(e, index) }}
                                                underline="hover"><EditIcon /></Link></TableCell>
                                            <TableCell style={{ width: "0.5em" }}><Link
                                                title={t("dashboard.reports.deleteItem")}
                                                component="button"
                                                onClick={(e) => { deleteItem(e, index) }}
                                                underline="hover"><DeleteIcon /></Link></TableCell>
                                            <TableCell key={index}>{item.data.title} </TableCell>
                                            <TableCell style={{ width:"0.3em" }}>{index > 0 && <Link
                                                title={"Move Up"}
                                                onClick={(e) => { swapItems(e, index, index-1); }}
                                                component="button"><ArrowDropUp/></Link>}</TableCell>
                                            <TableCell style={{ width:"0.3em" }}>{index !== (props.items.length-1) && <Link
                                                title={"Move Down"}
                                                onClick={(e) => { swapItems(e, index, index+1); }}
                                                component="button"><ArrowDropDown/></Link>}</TableCell>
                                        </TableRow>
                                    )


                                    if (index === 0 || !_.isEqual(props.items[index - 1].filter, item.filter)) {

                                        // TODO need to add in details of any restrictions as part of the extra row

                                        const filter = item.filter;

                                        const further = [];

                                        if (filter.query?.trim().length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.query", {query: filter.query})}</li>)
                                        }

                                        if (filter.authors?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.postedBy", {accounts: 
                                                filter.authors.map((author, i) => (i > 0 ? ", " : "") + author)
                                            })}</li>);
                                        }

                                        if (filter.mentions?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.mention", {accounts:
                                                filter.mentions.map((mention, i) => (i > 0 ? ", " : "") + mention)
                                            })}</li>);
                                        }

                                        if (filter.inReplyTo?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.inReplyTo", {accounts:
                                                filter.inReplyTo.map((account, i) => (i > 0 ? ", " : "") + account)
                                            })}</li>);
                                        }

                                        if (filter.accountTypes?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.associated", {types:
                                                filter.accountTypes.map((atype, i) => (i > 0 ? ", ": "") + atype)
                                            })}</li>)
                                        }

                                        if (filter.hashtags?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.hashtags", {hashtags:
                                                filter.hashtags.map((hashtag, i) => (i > 0 ? ", " : "") + hashtag)
                                            })}</li>);
                                        }

                                        if (filter.languages?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.languages", {languages:
                                                filter.languages.map((language, i) => (i > 0 ? ", " : "") + describeLanguage(language))
                                            })}</li>);
                                        }

                                        if (filter.countries?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.countries", {countries:
                                                filter.countries.map((country, i) => (i > 0 ? ", " : "") + getCountryName(country))
                                            })}</li>);
                                        }

                                        if (filter.users?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.relatedTo", {accounts:
                                                filter.users.map((user, i) => (i > 0 ? ", " : "") + location.users[user].name + " (" + location.users[user].platform + ")")
                                            })}</li>);
                                        }

                                        if (filter.platforms?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.platforms", {platforms:
                                                filter.platforms.map((platform, i) => {
                                                    return (i > 0 ? ", " : "") + platform})
                                            })}</li>);
                                        }

                                        if (filter.abuseTypes?.terms?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.abuseTypes", {mode: filter.abuseTypes.mode, types:
                                                filter.abuseTypes.terms.map((abuseType, i) => (i > 0 ? ", " : "") + abuseType)
                                            })}</li>)
                                        }

                                        if (filter.topics?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.topics", {topics:
                                                filter.topics.map((topic, i) => (i> 0 ? ", " : "") +t("dashboard.overview.topics."+topic))
                                            })}</li>)
                                        }

                                        if (filter.sources?.length > 0) {
                                            further.push(<li>{t("dashboard.reports.filter.sources", {sources:
                                                filter.sources.map((source, i) => (i> 0 ? ", " : "") +getSource(source).text)
                                            })}</li>)
                                        }

                                        return (
                                            <React.Fragment>
                                                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                    <TableCell colSpan="5" style={{ fontSize: 16, fontWeight: "bold" }}>
                                                        {t("dashboard.reports.filter.dates", {from: filter.from.toLocaleDateString(), to: filter.to.toLocaleDateString()})}<br />
                                                        {further.length > 0 && <span style={{ fontWeight: "normal" }}>{t("dashboard.reports.filter.restrictions")}<ul>{further.map(item => item)}</ul></span>}
                                                    </TableCell>
                                                </TableRow>
                                                {row}
                                            </React.Fragment>
                                        )
                                    }

                                    return row;
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>


                </Grid>}

            </Grid>
            <Dialog
                open={itemBeingEdited !== null}
                onClose={closeEditDialog}
                fullWidth
                maxWidth="md">
                <DialogContent>
                    {/*<Typography variant={"h6"}>{props.items[itemBeingEdited]?.data?.title}</Typography>*/}
                    <TextField
                        onChange={(event) => setItemTitle(event.target.value)}
                        variant={"outlined"}
                        defaultValue={itemTitle}
                        style={{width:"100%"}}
                        label={t("dashboard.reports.editor.title")}
                        error={itemTitle.trim() === ""}
                        helperText={itemTitle.trim() === "" && t("dashboard.reports.editor.help")}            
                    />
                    <Box mt={2}/>
                    <TextareaAutosize
                        placeholder={t("dashboard.reports.addComment")}
                        onChange={(event) => setItemComment(event.target.value)}
                        defaultValue={itemComment}
                        minRows={10}
                        style={{ marginTop: 5, width: "100%" }}
                    />
                    <Box mt={2}/>
                    
                    
                    <div id="preview">
                        {itemImages.map((image, i) =>
                            <img key={i} alt="" src={image} title="Double Click to Remove" style={{width:"25%"}} onDoubleClick={(e) => deleteImage(i)}/>
                        )}
                    </div>

                    <div id="toolbar" style={{clear:"both"}}>

                    <input accept="image/*" className={classes.input} style={{display:"none"}} id="icon-button-file" type="file" onChange={(event) => loadImages(event)}/>
                    <label htmlFor="icon-button-file">
                        <Button color="primary" aria-label="upload picture" variant={"contained"} component="span" >
                        <PhotoCamera /> {t("dashboard.reports.editor.img")}
                        </Button>
                    </label>

                        <span style={{float:"right"}}>
                            <Button color="primary" variant={"contained"} onClick={e => {closeEditDialog(null,"save")}}>{t("dashboard.reports.editor.save")}</Button>&nbsp;
                            <Button color="secondary" variant={"contained"} onClick={e => {closeEditDialog(null,"escapeKeyDown")}}>{t("dashboard.reports.editor.cancel")}</Button>
                        </span>
                    </div>

                </DialogContent>
            </Dialog>
        </Box>)
    );
}

export default Reports;