
var nodes = null;
var edges = null;
var network = null;
var FAKE_WEIGHT = 99999;

var networkDataNodes = null;
var networkDataEdges = null;

var newNodeInd;
var newEdgeInd;
var regionNodeId = 0;

var options = {
    physics:{
        enabled: false
    },
    interaction:{
        hover:true,
        selectConnectedEdges: false
    },
    manipulation: {
        addNode: function (data, callback) {
            // filling in the popup DOM elements
            console.log("addNode: " + JSON.stringify(data));
            document.getElementById('operation').innerHTML = "Add Node";
            document.getElementById('node-label').value = newNodeInd;
            document.getElementById('saveButton').onclick = saveNode.bind(this, data, callback);
            document.getElementById('cancelButton').onclick = clearPopUp.bind();
            document.getElementById('network-popUp').style.display = 'block';
        },
        editNode: function (data, callback) {
            console.log("editNode: " + JSON.stringify(data));
            // filling in the popup DOM elements
            document.getElementById('operation').innerHTML = "Edit Node";
            document.getElementById('node-label').value = data.label;
            document.getElementById('saveButton').onclick = saveNode.bind(this, data, callback);
            document.getElementById('cancelButton').onclick = cancelEdit.bind(this,callback);
            document.getElementById('network-popUp').style.display = 'block';
        },
        addEdge: function (data, callback) {
            console.log("addEdge: " + JSON.stringify(data));
            if (data.from != data.to) {
                var props = document.getElementsByClassName("node-prop");
                for(var i = 0; i< props.length; i++){
                    props[i].style.display = 'none'
                }
                props = document.getElementsByClassName("edge-prop");
                for(var i = 0; i< props.length; i++){
                    props[i].style.display = 'initial'
                }
                props = document.getElementsByClassName("edge-prop-edit");
                for(var i = 0; i< props.length; i++){
                    props[i].style.display = 'initial'
                }
                document.getElementById('network-popUp').style.display = 'block';
                document.getElementById('operation').innerHTML = "Add Edge";
                document.getElementById('saveButton').onclick = saveEdge.bind(this, data, callback);
                document.getElementById('cancelButton').onclick = clearPopUp.bind();
            }

        },
        editEdge: function (data, callback) {
            document.getElementById('operation').innerHTML = "Edit Edge";
            var e = edges[data.id];
            document.getElementById('isDupl').checked = e.isDupl;

            var props = document.getElementsByClassName("node-prop");
            for(var i = 0; i< props.length; i++){
                props[i].style.display = 'none'
            }
            props = document.getElementsByClassName("edge-prop");
            for(var i = 0; i< props.length; i++){
                props[i].style.display = 'none'
            }
            props = document.getElementsByClassName("edge-prop-edit");
            for(var i = 0; i< props.length; i++){
                props[i].style.display = 'initial'
            }
            document.getElementById('saveButton').onclick = editEdge.bind(this, data, callback);
            document.getElementById('cancelButton').onclick = clearPopUp.bind();
            document.getElementById('network-popUp').style.display = 'block';

        }
    }
};





function draw() {
    // create an array with nodes
    nodes = [];
    // create an array with edges
    edges = [];


    var container = document.getElementById('mynetwork');
    // create a network

    createNetwork(container);
}

function createNetwork(container) {
    networkDataNodes = new vis.DataSet(nodes);
    networkDataEdges = new vis.DataSet(edges)
    var data = {
        nodes: networkDataNodes,
        edges: networkDataEdges

    };

    destroy();

    network = new vis.Network(container, data, options);

    network.on("selectNode", function (params) {
        console.log(JSON.stringify(params));
        showNodeInfo(params);
    });
    network.on("selectEdge", function (params) {
        console.log(JSON.stringify(params));
        showEdgeInfo(params);
    });

}

function correctData(d) {
    d.nodes.forEach(function (n) {
        n.id = regionNodeId++;
    })
    d.edges.forEach(function (e) {
        e.to = d.nodes[e.to].id
        e.from = d.nodes[e.from].id
    })
}
function makeRouting() {
    for(var i = 1; i< nodes.length; i++){
        var nFrom = nodes[i];
        for(var j = 1; j < nodes.length; j++){
            if(i==j){
                continue;
            }
            var nTo = nodes[j];
            var path = getShortestPath(nFrom.id, nTo.id);
            var eds = getEdgesForSending(path)
            var sum = 0;
            eds.forEach(function (e) {
                sum += e.weight;
            });
            nFrom.routing.push({
                to: nTo.id,
                path: path,
                weight: sum
            });
        }
    }
}
function randomGraphGeneration() {
    newNodeInd = 0;
    newEdgeInd = 0;
    regionNodeId = 0;
    var errorFrom= document.getElementById('rand-error-from').value;
    var errorTo= document.getElementById('rand-error-to').value;
    var randParam = {
        errorFrom: errorFrom,
        errorTo: errorTo
    };
    if(IS_REGIONAL){
        var datas = [];
        for(var i = 0; i < REGIONS_NUMBER; i++){
            var d = getRandomGraph(MIN_NODES_IN_REGION, randParam);
            correctData(d);
            datas.push(d)
        }
        var n = {
            id: newNodeInd,
            label: String(newNodeInd),
            children: [],
            routing: []
        };
        newNodeInd++;

        for(var i = 0; i < datas.length; i++){
            var d = datas[i];
            var from = n.id;
            var to = d.nodes[getRandomInt(0, MIN_NODES_IN_REGION -1 )].id;
            // var w = getRandomInt(randParam.weightFrom, randParam.weightTo);
            var w = WEIGHT_ARRAY[getRandomInt(0, WEIGHT_ARRAY.length -1)];
            var error = getRandomFloat(randParam.errorFrom, randParam.errorTo);
            var e = {
                id: newEdgeInd,
                from: from,
                to: to,
                weight: w,
                error: error,
                sat_inp: true,
                isDupl: isDupl(),
                label: w,
                font: {align: 'top'},
                saved_weight: w
            };
            newEdgeInd++;
            datas[datas.length-1].edges.push(e)
        }
        datas[REGIONS_NUMBER-1].nodes.push(n);
        var data = {
            edges: [],
            nodes: []
        }
        datas.forEach(function (d) {
            d.nodes.forEach(function (n) {
                data.nodes.push(n);
            });
            d.edges.forEach(function (e) {
                data.edges.push(e);
            });
        });

    }else{
        var data = getRandomGraph(MIN_NODES, randParam);
    }

    edges = data.edges;
    nodes = data.nodes;
    makeRouting();
    var container = document.getElementById('mynetwork');
    createNetwork(container);
}
function getRandomGraph(minNodes, randParam) {
    var data = getScaleFreeNetwork(minNodes, randParam);
    for(var i = data.edges.length; i < minNodes * AVERAGE_RANG - data.edges.length; i++){
        var from = 0;
        var to = 0;
        do {
            from = getRandomInt(0, minNodes-1);
            to = getRandomInt(0, minNodes-1);
        }while(from == to || isEdgeExist(from, to, data.edges));



        // var w = getRandomInt(randParam.weightFrom, randParam.weightTo);
        var w = WEIGHT_ARRAY[getRandomInt(0, WEIGHT_ARRAY.length -1)];
        var error = getRandomFloat(randParam.errorFrom, randParam.errorTo);
        data.edges.push({
            id: newEdgeInd,
            from: from,
            to: to,
            weight: w,
            error: error,
            sat_inp: isSat(),
            isDupl: isDupl(),
            label: w,
            font: {align: 'top'},
            saved_weight: w
        });
        newEdgeInd++;
    }
    return data;
}
function isEdgeExist(from, to, edges) {
    for(var i = 0; i< edges.length; i++){
        var e = edges[i];
        if(e.to == to && e.from == from || e.to == from && e.from == to){
            return true;
        }
    }
    return false;
}

function isSat() {
    return false;
}

function getRandomInt(min, max) {
    min = Math.ceil(Number(min));
    max = Math.floor(Number(max));
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomFloat(min, max) {
    return Math.random() * (Number(max) - Number(min)) + Number(min)
}


function getScaleFreeNetwork(nodeCount, randParam) {
    var nodes = [];
    var edges = [];
    var connectionCount = [];

    // randomly create some nodes and edges
    for (var i = 0; i < nodeCount; i++) {
        nodes.push({
            id: newNodeInd,
            label: String(newNodeInd),
            children: [],
            routing: []
        });
        newNodeInd++;

        connectionCount[i] = 0;

        // create edges in a scale-free-network way
        if (i == 1) {
            var from = i;
            var to = 0;
            // var w = getRandomInt(randParam.weightFrom, randParam.weightTo);
            var w = WEIGHT_ARRAY[getRandomInt(0, WEIGHT_ARRAY.length -1)];

            var error = getRandomFloat(randParam.errorFrom, randParam.errorTo);
            edges.push({
                id: newEdgeInd,
                from: from,
                to: to,
                weight: w,
                error: error,
                sat_inp: isSat(),
                isDupl: isDupl(),
                label: w,
                font: {align: 'top'},
                saved_weight: w
            });
            newEdgeInd++;
            connectionCount[from]++;
            connectionCount[to]++;
        }
        else if (i > 1) {
            var conn = edges.length * 2;
            var rand = Math.floor(Math.random() * conn);
            var cum = 0;
            var j = 0;
            while (j < connectionCount.length && cum < rand) {
                cum += connectionCount[j];
                j++;
            }


            var from = i;
            var to = j;
            // var w = getRandomInt(randParam.weightFrom, randParam.weightTo);
            var w = WEIGHT_ARRAY[getRandomInt(0, WEIGHT_ARRAY.length -1)];
            var error = getRandomFloat(randParam.errorFrom, randParam.errorTo);
            edges.push({
                id: newEdgeInd,
                from: from,
                to: to,
                weight: w,
                error: error,
                sat_inp: isSat(),
                isDupl: isDupl(),
                label: w,
                font: {align: 'top'},
                saved_weight: w
            });
            newEdgeInd++;
            connectionCount[from]++;
            connectionCount[to]++;
        }
    }

    return {nodes:nodes, edges:edges};

}

function isDupl() {
    return false;
}

function clearPopUp() {
    document.getElementById('saveButton').onclick = null;
    document.getElementById('cancelButton').onclick = null;
    document.getElementById('network-popUp').style.display = 'none';
    var props = document.getElementsByClassName("node-prop");
    for(var i = 0; i< props.length; i++){
        props[i].style.display = 'initial'
    }
    props = document.getElementsByClassName("edge-prop");
    for(var i = 0; i< props.length; i++){
        props[i].style.display = 'none'
    }
    props = document.getElementsByClassName("edge-prop-edit");
    for(var i = 0; i< props.length; i++){
        props[i].style.display = 'none'
    }

}

function cancelEdit(callback) {
    clearPopUp();
    callback(null);
}

function saveNode(data,callback) {
    var id = newNodeInd;
    var label = document.getElementById('node-label').value;
    data.id = id;
    data.label = label;
    newNodeInd++;
    nodes.push({
        id: id,
        label: label,
        children: [],
        routing: []
    });
    // networkDataNodes.add({id: id, label: label});
    clearPopUp();
    callback(data);
}

function saveEdge(data,callback) {
    var weight = document.getElementById('weight').value;
    var error = document.getElementById('error-probability').value;
    var sat_inp = document.getElementById('sat-inp').checked;
    var dup = document.getElementById('isDupl').checked;
    data.id = newEdgeInd;
    data.label = weight;
    data.font =  {align: 'top'};

    edges.push({
        id: data.id,
        from: data.from,
        to: data.to,
        weight: weight,
        error: error,
        sat_inp: sat_inp,
        isDupl: dup,
        label: weight,
        font: {align: 'top'},
        saved_weight: weight
    });
    newEdgeInd++;
    // networkDataEdges.add({id: data.id, from: data.from, to: data.to});
    console.log("My out: " + JSON.stringify(edges));
    clearPopUp();
    callback(data);
}

function editEdge(data,callback) {
    var weight = edges[data.id].saved_weight;
    var error = edges[data.id].error;
    var sat_inp = edges[data.id].sat_inp;
    var dup = document.getElementById('isDupl').checked;

    var isTurnedOff = document.getElementById('isTurnedOff').checked;


    edges[data.id] = {
        id: data.id,
        from: data.from,
        to: data.to,
        weight: isTurnedOff?FAKE_WEIGHT:weight,
        error: error,
        sat_inp: sat_inp,
        isDupl: dup,
        label: weight,
        font: {align: 'top'},
        saved_weight: weight
    };
    if(isTurnedOff){
        data.label = "";
    }else{
        data.label = weight;
    }
    // networkDataEdges.add({id: data.id, from: data.from, to: data.to});
    console.log("My out: " + JSON.stringify(edges));
    clearPopUp();
    callback(data);
}

function destroy() {
    if (network !== null) {
        network.destroy();
        network = null;
    }
}

function showNodeInfo(params) {
    var nodeInd = params.nodes[0];
    var node = nodes[nodeInd];

    document.getElementById('info-title').innerHTML = "About node";
    var info = document.getElementById('info-body');
    info.innerHTML = "";

    p = document.createElement('p');
    p.innerHTML = "Label: " + node.label;
    info.appendChild(p);

    p = document.createElement('h5');
    p.innerHTML = "Routing: ";
    info.appendChild(p);

    node.routing.forEach(function (el) {
        p =  document.createElement('p');
        p.innerHTML = "" + node.id + "&#8594;" + el.to + " : " + JSON.stringify(el.path) + " Minimal weight:&#8594;" + el.weight;
        info.appendChild(p);
    });

    document.getElementById('info').style.display = 'block';
    console.log("Children: " + JSON.stringify(nodes[nodeInd]))
}

function showEdgeInfo(params) {
    var edgeInd = params.edges[0];
    var edge = edges[edgeInd];

    document.getElementById('info-title').innerHTML = "About edge";
    var info = document.getElementById('info-body');
    info.innerHTML = "";
    var p = document.createElement('p');
    p.innerHTML = "ID: " + edge.id;
    info.appendChild(p);

    p = document.createElement('p');
    p.innerHTML = "From: " + edge.from;
    info.appendChild(p);

    p = document.createElement('p');
    p.innerHTML = "To: " + edge.to;
    info.appendChild(p);

    p = document.createElement('p');
    p.innerHTML = "Weight: " + edge.weight;
    info.appendChild(p);

    p = document.createElement('p');
    p.innerHTML = "Error Probability: " + edge.error;
    info.appendChild(p);



    document.getElementById('info').style.display = 'block';
}

function getNodes() {
    return nodes;
}
function getEdges() {
    return edges;
}

function getNetworkNodes() {
    return networkDataNodes;
}
function getNetworkEdges() {
    return networkDataEdges;
}

function getNetwork() {
    return network;
}

function getFakeWeight() {
    return FAKE_WEIGHT
}