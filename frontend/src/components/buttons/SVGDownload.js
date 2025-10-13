import SavePNGIcon from '@mui/icons-material/PhotoCamera';
import SaveSVGIcon from '@mui/icons-material/Image';
import { select } from "d3-selection";

import Plotly from 'plotly.js-dist-min'
import Link from "@mui/material/Link";
import {useSelector} from "react-redux";

import {getISODate} from "../../api"

import { useTranslation } from 'react-i18next';


/**
 * Find the smallest rectangle that surrounds two bounding boxes
 * @param a {DOMRect} the first box
 * @param b {DOMRect} the second box
 * @return {DOMRect} the smallest box that contains both a and b
 */
const containingBox = (a, b) => {
    // find the top left
    const minX1 = Math.min(a.x, b.x);
    const minY1 = Math.min(a.y, b.y);
    // find the bottom right
    const maxX2 = Math.max(a.x+a.width, b.x+b.width);
    const maxY2 = Math.max(a.y+a.height, b.y+b.height);

    return {x: minX1, y: minY1, width: maxX2 - minX1, height: maxY2 - minY1 };
}

export function getSVG(id, fill, fixBBox) {

    const div = select(document.getElementById(id));

    // find the _first_ svg descendant of the specified div and treat this as the "main" SVG
    const firstSvg = div.select("svg").node();
    // For plotly plots, what we have is a series of sibling svg elements, all with the same
    // dimensions, that are laid out one on top of the other to build up the final plot.
    // There's one for the plot itself, another one for the legend, etc.  In order to export
    // the whole thing as SVG we "flatten" the sibling svgs into one by cloning the first one
    // to use as a container, then cloning the _children_ of the second and subsequent svgs
    // and appending those to the container document.  The result of this is a single svg
    // element containing all the content from all the siblings, properly layered.
    //
    // Note that this *only* works when all the sibling svg elements have exactly the same
    // width and height.
    //
    // For the word clouds there is only one svg, so whole "clone the siblings' children"
    // process is a no-op, we just end up with a deep clone of the original cloud svg.
    const mergedSvg = firstSvg.cloneNode(true)
    
    // merge in sibling svg elements
    let svg = firstSvg.nextElementSibling;
    // while computing the containing bbox of all of them - sadly we can't use the overall
    // bbox of the merged SVG as it doesn't have one until it is rendered to the screen
    let bbox = firstSvg.getBBox();
    while (svg) {
        if (svg.tagName === "svg" && svg.hasChildNodes()) {
            bbox = containingBox(bbox, svg.getBBox())
            for (let child of svg.childNodes) {
                mergedSvg.appendChild(child.cloneNode(true));
            }
        }
        svg = svg.nextElementSibling;
    }

    if(fixBBox && !mergedSvg.hasAttribute("viewBox")) {
        // adjust the width, height and viewBox on the assembled SVG so anything outside the
        // visible boundary is still included in the SVG
        let h = mergedSvg.getAttribute("height") ?? 0;
        let w = mergedSvg.getAttribute("width") ?? 0;
        let x = 0;
        let y = 0;

        // we need to adjust the svg height and width to cover the bounding rect containing
        // both bbox (the actual SVG content) and the rect [0, 0, w, h] (the declared size
        // of the SVG image).

        // first adjust for the top left corner of bbox, if it is outside the top/left sides
        if(bbox.x < 0) {
            x = Math.floor(bbox.x);
            // we moved x left, so increase the width to put the right edge back where it was
            w = Math.ceil(w - bbox.x);
        }
        if(bbox.y < 0) {
            y = Math.floor(bbox.y);
            // we moved y up, so increase the height to put the bottom edge back where it was
            h = Math.ceil(h - bbox.y);
        }
        // now extend the width and height if the bbox still exceeds the adjusted dimensions
        if(w < bbox.width) {
            w = Math.ceil(bbox.width);
        }
        if(h < bbox.height) {
            h = Math.ceil(bbox.height);
        }

        mergedSvg.setAttribute("width", `${w}`);
        mergedSvg.setAttribute("height", `${h}`);
        mergedSvg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    }

    if (fill) {
        // add a background rect to the merged svg, taking its colour from the originally-specified div
        select(mergedSvg).append("rect")
            .attr("x",0).attr("y",0)
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("fill",window.getComputedStyle(div.node()).backgroundColor)
            .lower();
    }

    // convert to string using XMLSerializer so it adds the correct XML namespaces
    return {
        content: new XMLSerializer().serializeToString(mergedSvg),
        width: +(mergedSvg.getAttribute("width") ?? 0),
        height: +(mergedSvg.getAttribute("height") ?? 0)
    };
}

function svgToPng(url, width, height) {
    // convert an svg text to png using the browser
    return new Promise(function(resolve, reject) {
      try {
        // create a canvas element to pass through
        var canvas = document.createElement("canvas");
        canvas.width = width;//height+margin*2;
        canvas.height = height; //width+margin*2;
        var ctx = canvas.getContext("2d");

        // create a new image to hold it the converted type
        var img = new Image();
        
        // when the image is loaded we can get it as base64 url
        img.onload = function() {
          // draw it to the canvas
          ctx.drawImage(this, 0, 0);
          
          // we don't need the original any more
          window.URL.revokeObjectURL(url);

          // now we can resolve the promise, passing the replacement blob url
          canvas.toBlob((blob) => {
            resolve(window.URL.createObjectURL(blob));
          })
        };
        
        // load the image
        img.src = url;
        
      } catch (err) {
        reject('failed to convert svg to png ' + err);
      }
    });
  }

export async function getBlob(id, fill, fixBBox=true) {
    let { content, width, height } = getSVG(id, fill, fixBBox);

        // make a blob URL for the SVG
        let svg = new Blob([content], {
            type: "image/svg+xml;charset=utf-8"
        });
        let url = window.URL.createObjectURL(svg);
        
        // convert the SVG to PNG
        if (!width || !height) {
            const dimensions = document.getElementById(id).getBoundingClientRect();
            width = dimensions.width;
            height = dimensions.height;
        }

        url = await svgToPng(url, width, height);
        // svgToPng internally revokes the original blob url before returning a new one
        
        return url;
}

const SVGDownload = ({ id, filename, fill, type, prepareImage, resetImage, fixBBox = true }) => {

    //i know i've added i18n and it isn't used. sorry linter.
    //eslint-disable-next-line
    const { t, i18n } = useTranslation()

    async function downloadImage(id, link, format) {

        var target = select(link.target).node();

        while (target.nodeName !== "A") {
            target = target.parentNode;
        }

        let { content, width, height } = getSVG(id, fill, fixBBox);

        // make a blob URL for the SVG
        let svg = new Blob([content], {
            type: "image/svg+xml;charset=utf-8"
        });
        let url = window.URL.createObjectURL(svg);

        if(format === "png") {
            // convert the SVG to PNG
            if (!width || !height) {
                const dimensions = document.getElementById(id).getBoundingClientRect();
                width = dimensions.width;
                height = dimensions.height;
            }

            url = await svgToPng(url, width, height);
            // svgToPng internally revokes the original blob url before returning a new one
        }

        const alink = document.createElement('a');
        alink.id = 'imageDownload';
        alink.href = url;
        alink.download = target.download;

        alink.click();

        alink.remove();

        // and expire the final object URL in 60 seconds, to give it plenty of time to be
        // downloaded
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    }
    
    function saveAsImage(id, link, format) {
        link.preventDefault();

        function saveAndReset() {
            return downloadImage(id, link, format).then(() =>
                resetImage && (resetImage.layout
                    ? Plotly.relayout(id, resetImage)
                    : Plotly.restyle(id, resetImage)));
        }

        if(prepareImage) {
            prepareImage.layout ?
                Plotly.relayout(id, prepareImage).then(saveAndReset) :
                Plotly.restyle(id, prepareImage).then(saveAndReset)
        }
        else {
            saveAndReset();
        }
    }

    const user = useSelector(state => state.dashboard.user);
    const overview = useSelector(state => state.dashboard.overview);


    if (type === "PNG") {
        return (
            (<Link
                title={t("dashboard.download.png")}
                href="#"
                download={encodeURIComponent(user.id+"_"+getISODate(overview.from)+"_"+getISODate(overview.to)+"_"+filename)}
                onClick={(e) => {saveAsImage(id,e, "png");}}
                underline="hover">
                <SavePNGIcon style={{verticalAlign:"middle"}}/>
            </Link>)
        );
    }

    return (
        (<Link
            title={t("dashboard.download.svg")}
            href="#"
            download={encodeURIComponent(user.id+"_"+getISODate(overview.from)+"_"+getISODate(overview.to)+"_"+filename)}
            onClick={(e) => {saveAsImage(id,e, "svg");}}
            underline="hover">
            <SaveSVGIcon style={{verticalAlign:"middle"}}/>
        </Link>)
    );
}

export default SVGDownload;