///<reference path="../../../lib/graphlib.d.ts"/>

var Graphlib = require('graphlib');


export function cloneGraph(graph : Graphlib.Graph<any, any>) : Graphlib.Graph<any, any> {

    let newGraph = new Graphlib.Graph({ directed: graph.isDirected(),
                                        compound: graph.isCompound(),
                                        multigraph: graph.isMultigraph() });

    graph.nodes().forEach(node => newGraph.setNode(node, graph.node(node)));
    graph.edges().forEach((edge : Graphlib.Edge<any>) => newGraph.setEdge(edge.v, edge.w, edge.name));

    return newGraph;
}