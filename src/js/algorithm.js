
function processShortestPath() {
    var from = document.getElementById('alg-from').value;
    var to = document.getElementById('alg-to').value;
    var shortestPath = getShortestPath(from, to);

    console.log("My path: " + shortestPath);

    nodes.forEach(function (n) {
        getNetworkNodes().update({id: n.id, color: {background: "#97C2FC"}})
    });

    shortestPath.forEach(function (el) {
        getNetworkNodes().update({id: el, color: {background: "#FF0000"}});
        getNetworkEdges().update({id: nodes[el].c})
    });
}

function getShortestPath(from, to) {
    var nodes = getNodes();
    var edges = getEdges();

    for(var i = 0; i< edges.length; i++){
        var e = edges[i];
        nodes[e.from].children.push({p: e.to, w: e.weight, id: e.id});
        nodes[e.to].children.push({p: e.from, w: e.weight, id: e.id});
    }
    var map = {};
    for(var i = 0; i< nodes.length; i++){
        var n  = nodes[i];
        path = {};
        n.children.forEach(function (el) {
            path[el.p] = el.w
        });
        map[n.id] = path;
    }
    var g = new Graph(map);


    return g.findShortestPath(from,to);
}
