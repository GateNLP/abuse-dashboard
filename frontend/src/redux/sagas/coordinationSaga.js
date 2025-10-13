import { all, call, fork, put, takeLatest } from "redux-saga/effects";
import axios from "axios";

import { getISODate } from "../../api";
import { setCoordinationStatus, setCoordinationGraph, getCoordinationGraph } from "../actions/coordinationActions";

import UndirectedGraph from "graphology";
import { scaleSqrt, scaleLinear } from "d3-scale";
import { interpolateGreys } from "d3-scale-chromatic";
import circlepack from 'graphology-layout/circlepack';
import random from 'graphology-layout/random';
import louvain from 'graphology-communities-louvain';

function* requestCoordinationySaga() {
    yield takeLatest(["REQUEST_COORDINATION"], handleRequest)
}

function* getStatusSaga() {
    yield takeLatest(["GET_COORDINATION_STATUS"], handleStatus)
}

function* getGraphSaga() {
    yield takeLatest(["GET_COORDINATION_GRAPH"], handleGraph)
}

const endpoint = ".";//process.env.REACT_APP_CONVERSATION_API

function* handleRequest(action) {

    try {

        let status = yield call(requestCoordinationAPI, action.payload.query, action.payload.filter, action.payload.from, action.payload.to)

        yield put(setCoordinationStatus(status.jobID, status.status))

        if (status.status === "finished") {
            yield put(getCoordinationGraph(status.jobID))
        }

    } catch (error) {
        console.log(error)
        //yield put(setFlashMessage("error", "An unexpected error occured, please try again later."));
    }
}

function* handleStatus(action) {
    try {
        let status = yield call(requestStatus, action.payload.jobID)

        yield put(setCoordinationStatus(status.jobID, status.status))

    } catch (error) {
        console.log(error)
    }
}

const getUniqueColor = (n) => {
        const rgb = [0, 0, 0];

        for (let i = 0; i < 24; i++) {
            rgb[i % 3] <<= 1;
            rgb[i % 3] |= n & 0x01;
            n >>= 1;
        }

        return '#' + rgb.reduce((a, c) => (c > 0x0f ? c.toString(16) : '0' + c.toString(16)) + a, '')
    };


function* handleGraph(action) {
    try {

        // this should make sure that we don't get called twice from
        // the UI, as the graph in the state will no longer be null
        yield put(setCoordinationGraph(new UndirectedGraph()))

        let raw = yield call(getGraph, action.payload.jobID)

        let graph = new UndirectedGraph()

        var edges = raw["edges"].reverse();

        var edgeMax = edges[edges.length - 1]["attributes"]["size"];
        var edgeMin = edges[0]["attributes"]["size"];

        var linear = scaleLinear().domain([edgeMin, edgeMax]).range([0, 1]);

        edges.forEach(edge => {

            edge.attributes.weight = linear(edge.attributes.size);
            edge.attributes.size = linear(edge.attributes.size) * 5;
            edge.attributes.color = interpolateGreys(edge.attributes.weight*0.6);

        })

        graph.import(raw);

        var maxDegree = 0;
        graph.forEachNode((node, attributes) => {
            maxDegree = Math.max(maxDegree, graph.degree(node))
        })

        var nodeLinear = scaleLinear().domain([1, maxDegree]).range([5, 20]);

        louvain.assign(graph);

        graph.forEachNode((node, attributes) => {
            attributes.size = nodeLinear(graph.degree(node));
            attributes.color = getUniqueColor(attributes.community);
        })

        try {
            circlepack.assign(graph, {
                hierarchyAttributes: ['community', 'degree']
            });
        } catch(err) {
            console.error(err);
            random.assign(graph);
        }

        yield put(setCoordinationGraph(graph, raw))

        // need to process the JSON to build the actual graph structure here

    } catch (error) {
        console.log(error)
    }
}

const requestCoordinationAPI = async (query, filter, from, to) => {
    let json = await axios.post(endpoint + "/coordination/process?"
        + "query=" + encodeURIComponent(query || "")
        + "&from=" + encodeURIComponent(getISODate(from))
        + "&to=" + encodeURIComponent(getISODate(to)),
        filter)

    return json.data
}

const requestStatus = async (jobID) => {

    let json = await axios.get(endpoint + "/coordination/" + jobID + "/status")

    return json.data
}

const getGraph = async (jobID) => {
    let json = await axios.get(endpoint + "/coordination/" + jobID + "/graph")

    return json.data
}


export default function* coordinationSaga() {
    yield all([
        fork(requestCoordinationySaga),
        fork(getStatusSaga),
        fork(getGraphSaga)
    ]);
}