var SERVICE_PART_SIZE = 128;
var INFORM_PART_SIZE = 1500;
var SERVICE_PACKET = 128;
var MAX_CAPACITY = 20000;
var STEP_CAPACITY = 50;
var MIN_WEIGHT = 50;
var packets;
var datagramEdges = [];
var packetsAndPath = [];
var packetId = 0;
var timeSum = [];

var intensity = 0;
var INTENSITY_TIME = 1000;





function send() {
    var radios = document.getElementsByName('type');
    var size =  document.getElementById('message-size').value;
    var count =  1;
    var from =  document.getElementById('send-from').value;
    var to =  document.getElementById('send-to').value;
    document.getElementById("log-body").innerHTML = "";
    timeSum = [];
    packetId = 0;
    intensity = 0;

    if(radios[0].checked){
        processDatagram(from, to, size, count);
    }else{
        processLogicLink(from, to, size, count);
    }
}


function processDatagram(from, to, size, count) {
    var paths = getPathsArray(from, to);
    createPackets(size, count);
    packetsAndPath = connectPacketsToPaths(paths);
    datagramEdges = [];
    packetsAndPath.forEach(function (r) {
        var e = getEdgesForSending(r.path);
        initEdges(e, r.packets.slice());
        datagramEdges.push(e)
    });
    var bytesSum = 0;
    for(var i = 0; i < packetsAndPath.length; i++){
         setTimeoutFunction(i, bytesSum);
    }

    showFinishMessage(from, to, bytesSum, Math.round(timeSum.reduce(function(a, b) { return a + b; }, 0)/paths.length) );

}

function setTimeoutFunction(ind, bytesSum) {
    var ed = datagramEdges[ind];
    var path = packetsAndPath[ind].path;
    bytesSum += process(path, ed, true);
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
        e.countPackets = 0;
        e.workedTime = 0;
        edges[i] = e;

    }
    edges[0].outQ = data;
}

function processLogicLink(from, to, size, count) {
    var shortestPath = getShortestPath(from, to);
    var edges = getEdgesForSending(shortestPath);

    createServicePacket();
    initEdges(edges, packets.slice());
    var serviceSize = process(shortestPath, edges, false);


    createPackets(size, count);
    initEdges(edges, packets.slice());
    var informSize = process(shortestPath, edges, false);


    showFinishMessage(from, to, serviceSize+informSize, timeSum.reduce(function(a, b) { return a + b; }, 0));
}

function process(shortestPath, edges, isDatagram) {
    var stopFlag = false;
    var controlSum = edges[0].outQ.length;
    var pack = edges[0].outQ.slice();

    var startProcessTime = (new Date()).getTime();
    while (!stopFlag){
        for(var i = 0; i< shortestPath.length - 1; i++) {
            var n = shortestPath[i];
            var e = edges[i];

            //Перенос из входящай очереди в узел в выходящую очередь в узел следующего канала
            if (e.inQ.length != 0 && i != shortestPath.length - 2) {
                var p = e.inQ.pop();
                edges[i + 1].outQ.push(p);
                showOutQMessage(p.info, p.service,shortestPath[i+1], p.id)

            }

            //Перенос из канала в входящую очередь следующего узла
            if (e.packets.length != 0) {
                if (e.deliveredTime <= (new Date()).getTime()) {
                    var p = e.packets.pop();
                    intensity++;
                    if (isError(e)) {
                        if(isDatagram){
                            showErrorMessage(p.id, "(Packet lost)")
                            controlSum--;
                        }else{
                            e.outQ.unshift(p);
                            showErrorMessage(p.id, "")
                        }

                    } else {
                        e.inQ.push(p);
                        showInQMessage(p.info, p.service,shortestPath[i], shortestPath[i+1], p.id);
                        if(i == shortestPath.length - 2){
                            var time = (new Date()).getTime() - p.startTime;
                            showFinishPacketMessage(p.id, time)
                        }
                    }
                }
            }

            //Перенос из выходящей очереди в канал
            if (e.outQ.length != 0) {
                if (e.packets.length == 0) {
                    var p = e.outQ.pop();
                    if(p.startTime == 0){
                        p.startTime = (new Date()).getTime();
                    }
                    var sat = e.sat_inp ? 3 : 1;
                    var capacity = (MAX_CAPACITY - (e.weight - MIN_WEIGHT) * STEP_CAPACITY) * sat;
                    var extraTime = Math.round((p.info + p.service) / capacity * 1000);
                    e.packets.push(p);
                    e.deliveredTime = (new Date()).getTime() + extraTime;
                    showInChannelMessage(p.info, p.service, shortestPath[i+1], p.id);


                }
            }
        }

        if(edges[edges.length-1].inQ.length == controlSum){
            stopFlag = true;
        }
    }

    edges[edges.length-1].inQ = [];
    var processTime = (new Date()).getTime() - startProcessTime;
    timeSum.push(processTime);
    return getByteCount(pack)
}

function getByteCount(pack) {
    var sum = 0;
    pack.forEach(function (p) {
        sum += p.info + p.service;
    });
    return sum;
}

function createPackets(size, count) {
    packets = [];
    var allSize = size * count;
    var countPackets = Math.round(allSize / INFORM_PART_SIZE);
    var lastPacketSize = allSize % INFORM_PART_SIZE;
    for(var i = 0; i < countPackets; i++){
        packets.push({
            id: packetId++,
            info:  INFORM_PART_SIZE,
            service: SERVICE_PART_SIZE,
            startTime: 0
        });
    }
    if(lastPacketSize != 0){
        packets.push({
            id: packetId++,
            info:  lastPacketSize,
            service: SERVICE_PART_SIZE,
            startTime: 0
        });
    }
}
function createServicePacket() {
    packets = [];
    packets.push({
        id: packetId++,
        info:  0,
        service: SERVICE_PACKET,
        startTime: 0
    });
}

function findEdge(to, children) {
    for(var i = 0; i < children.length; i++){
        var e = children[i];
        if(e.p == to){
            return JSON.parse(JSON.stringify(getEdges()[e.id]));
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
    return edges.slice();
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


function showInQMessage(info, service, nodeIdTo, nodeIdFrom, id) {
    document.getElementById("log-body").innerHTML += "<p class='info'>Packet "+ id +" which contains "+service+" bytes of service part"+
        " and "+info+" bytes of info part has been put in input queue of "+nodeIdFrom+" node</p>"
}
function showOutQMessage(info, service, nodeId, id) {
    document.getElementById("log-body").innerHTML += "<p class='info'>Packet "+ id +" which contains "+service+" bytes of service part"+
        " and "+info+" bytes of info part has been put in out queue of "+nodeId+" node</p>"
}
function showInChannelMessage(info, service, nodeId, id) {
    document.getElementById("log-body").innerHTML += "<p class='yellow'>Packet "+ id +" which contains "+service+" bytes of service part"+
        " and "+info+" bytes of info part is in channel to "+nodeId+" node</p>"
}
function showLog() {
    document.getElementById("log-info").showModal()
}
function hideLog() {
    document.getElementById("log-info").close()
}


function showFinishPacketMessage(id, time) {
    document.getElementById("log-body").innerHTML += "<p class='green'>Packet "+ id +" has sent ("+ time +"ms)</p>"
}

function showErrorMessage(id, message) {
    document.getElementById("log-body").innerHTML += "<p class='red'>Error occurred in packet "+id+" "+message+"</p>"
}

function showFinishMessage(idFrom, idTo, byteCount, time) {
    document.getElementById("log-body").innerHTML += "<h4 class='green'>Message of "+ byteCount +"bytes has been sent from "+ idFrom +" node to "+ idTo +" node("+ time +"ms)</h4>";
    document.getElementById("log-body").innerHTML += "<h4 class='green'>Average intensity: "+intensity/(time/1000)+" packets/second</h4>"

}