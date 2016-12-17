/**
 * Created by danastasiev on 12/10/16.
 */
var SERVICE_PART_SIZE = 32;
var INFORM_PART_SIZE = 128;
var SERVICE_PACKET = 128;
var MAX_CAPACITY = 256;
var STEP_CAPACITY = 2;
var MIN_WEIGHT = 50;
var packets;
var datagramEdges = [];
var packetsAndPath = [];






function send() {
    var radios = document.getElementsByName('type');
    var size =  document.getElementById('message-size').value;
    var count =  document.getElementById('message-count').value;
    var from =  document.getElementById('send-from').value;
    var to =  document.getElementById('send-to').value;

    if(radios[0].checked){
        processDatagram(from, to, size, count);
    }else{
        processLogicLink(from, to, size, count);
    }
    document.getElementById("log-info").showModal()
}


function processDatagram(from, to, size, count) {
    var paths = getPathsArray(from, to);
    createPackets(size, count);
    packetsAndPath = connectPacketsToPaths(paths);
    datagramEdges = [];
    packetsAndPath.forEach(function (r) {
        var e = getEdgesForSending(r.path).slice();
        initEdges(e, r.packets.slice());
        datagramEdges.push(e)
    });
    for(var i = 0; i < packetsAndPath.length; i++){
         setTimeout(setTimeoutFunction(i), 0)
    }

}

function setTimeoutFunction(ind) {
    var ed = datagramEdges[ind];
    var path = packetsAndPath[ind].path
    process(path, ed);
}

function connectPacketsToPaths(paths) {
    var res = [];
    paths.forEach(function (p) {
        res.push({
            path: p,
            packets: []
        });
    });
    var countPerPath =  Math.round(packets.length / paths.length);
    var i = 0;
    while (packets.length != 0){
        res[i].packets.push(packets.pop());
        i = ++i % paths.length;
    }
    return res;
}

function getPathsArray(from, to) {
    var res = [];

    while(true){
        var shortestPath = getShortestPath(from, to);
        var edges = getEdgesForSending(shortestPath);
        if(isEnd(edges)){
            break;
        }
        makeFakePath(edges);
        res.push(shortestPath)
    }
    for(var i = 0; i< getEdges().length; i++){
        turnONEdge(i)
    }
    return res;

}
function makeFakePath(edges) {
    for(var i = 0; i< edges.length; i++){
        turnOffEdge(edges[i].id)
    }
}
function isEnd(edges) {
    for(var i = 0; i< edges.length; i++){
        if(edges[i].weight != getFakeWeight()){
            return false;
        }
    }
    return true;
}

function initEdges(edges, data) {
    for(var i = 0; i< edges.length; i++){
        var e = edges[i];
        e.inQ = [];  // Входящая в УЗЕЛ
        e.outQ = []; // Исходящая из УЗЛА
        e.packets = [];
        e.deliveredTime = 0;
        edges[i] = e;

    }
    edges[0].outQ = data;
}

function processLogicLink(from, to, size, count) {
    var shortestPath = getShortestPath(from, to);
    var edges = getEdgesForSending(shortestPath);

    createServicePacket();
    initEdges(edges, packets.slice());
    process(shortestPath, edges);


    createPackets(size, count);
    initEdges(edges, packets.slice());
    process(shortestPath, edges);

}


function process(shortestPath, edges) {
    var stopFlag = false;
    var controlSum = edges[0].outQ.length;

    while (!stopFlag){
        for(var i = 0; i< shortestPath.length - 1; i++) {
            var n = shortestPath[i];
            var e = edges[i];

            //Перенос из входящай очереди в узел в выходящую очередь в узел следующего канала
            if (e.inQ.length != 0 && i != shortestPath.length - 2) {
                edges[i + 1].outQ.push(e.inQ.pop())
            }

            //Перенос из канала в выходящую очередь следующего узла
            if (e.packets.length != 0) {
                if (e.deliveredTime <= (new Date).getTime()) {
                    if (isError(e)) {
                        e.outQ.unshift(e.packets.pop())
                    } else {
                        e.inQ.push(e.packets.pop())
                    }
                }
            }

            //Перенос из выходящей очереди в канал
            if (e.outQ.length != 0) {
                if (e.packets.length == 0) {
                    var p = e.outQ.pop();
                    var sat = e.sat_inp ? 3 : 1;
                    var capacity = (MAX_CAPACITY - (e.weight - MIN_WEIGHT) * STEP_CAPACITY) * sat;
                    var extraTime = Math.round((p.inf + p.service) / capacity * 1000);
                    e.packets.push(p);
                    e.deliveredTime = (new Date).getTime() + extraTime;
                }
            }
        }

        if(edges[edges.length-1].inQ.length == controlSum){
            stopFlag = true;
        }
    }
}

function createPackets(size, count) {
    packets = [];
    var allSize = size * count;
    var countPackets = Math.round(allSize / 128);
    var lastPacketSize = allSize % 128;
    for(var i = 0; i < countPackets; i++){
        packets.push({
            inf:  INFORM_PART_SIZE,
            service: SERVICE_PART_SIZE
        });
    }
    if(lastPacketSize != 0){
        packets.push({
            inf:  lastPacketSize,
            service: SERVICE_PART_SIZE
        });
    }
}
function createServicePacket() {
    packets = [];
    packets.push({
        inf:  0,
        service: SERVICE_PACKET
    });
}
function hideDialog() {
    document.getElementById("log-info").close()
}

function findEdge(to, children) {
    for(var i = 0; i < children.length; i++){
        var e = children[i];
        if(e.p == to){
            return getEdges()[e.id];
        }
    }
}


function getEdgesForSending(shortestPath) {
    var edges = [];
    for(var i = 0; i < shortestPath.length - 1; i++){
        var from = shortestPath[i];
        var to = shortestPath[i+1];
        edges.push(findEdge(to, getNodes()[from].children))
    }
    return edges;
}

function isError(e) {
    var error = e.error;
    var random = getRandomFloat(0, 1);
    return error > random;
}

function turnOffEdge(edgeId) {
    var e = getEdges()[edgeId];
    e.weight = getFakeWeight();
    getEdges()[edgeId] = e;
}

function turnONEdge(edgeId) {
    var e = getEdges()[edgeId];
    e.weight = e.saved_weight;
    getEdges()[edgeId] = e;
}


