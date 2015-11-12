///<reference path="../../../../lib/graphlib.d.ts"/>

import {model} from '../model';

var Graphlib = require('graphlib');

function createGraphFromPipeline(data : model.Pipeline) : Graphlib.Graph<any, any> {
    let options = { directed: true, compound: false, multigraph: false };
    let graph : Graphlib.Graph<any, any> = new Graphlib.Graph(options);

    data.jobs.forEach((job : model.Job) => {
        graph.setNode(job._id, job);
    });

    data.dependencies.forEach((dependency : model.Dependency) => {
        graph.setEdge(dependency.up, dependency.down);
    });

    if(!Graphlib.alg.isAcyclic(graph)) {
        throw 'pipeline graph contains circular dependencies: ' + JSON.stringify(data);
    }

    if(graph.sources().length > 1) {
        throw 'pipeline graph has more than one source nodes: ' + JSON.stringify(data);
    }

    return graph;
}

function nodesSortedByDistance(graph : Graphlib.Graph<any, any>, source : any) : Array<any> {
    let distances = Graphlib.alg.dijkstra(graph, source);
    let nodes:Array<any> = [];

    for (var prop in distances) {
        if (distances.hasOwnProperty(prop)) {
            let distanceToSource = distances[prop].distance;
            if(distanceToSource == Number.POSITIVE_INFINITY) {
                throw 'pipeline graph contains unconnected nodes: ' + Graphlib.Json.write(graph);
            }
            nodes.push({nodeId : prop, distance: distanceToSource})
        }
    }

    let sortByDistance = (node1, node2) => { return node1.distance - node2.distance };

    let sortedNodes = nodes.sort(sortByDistance);

    return sortedNodes.map((item) => {return item.nodeId});
}

export class PipelineGraph {

    private graph : Graphlib.Graph<model.Job, void>;

    constructor(data : model.Pipeline) {
        this.graph = createGraphFromPipeline(data);
    }

    next() : model.Job {

        let source:model.Job = this.graph.sources()[0];
        let nodesSorted = nodesSortedByDistance(this.graph, source);

        // iterates over all the jobs by closest distance from source
        for(let i = 0; i < nodesSorted.length; i++) {

            let nodeId = nodesSorted[i];
            let job : model.Job = this.graph.node(nodeId);

            // the next job to be queued has to be currently idle
            if(!(job.status == model.BuildStatus.IDLE)) {
                continue;
            }

            // we move the jobs only when all the previous builds succeeded
            let predecessorsIds : Array<string> = this.graph.predecessors(nodeId);
            let predecessorsFinished = predecessorsIds.every(id => { return this.graph.node(id).status == model.BuildStatus.SUCCESS });

            if(predecessorsFinished) {
                return job;
            }

        }

        return null;
    }

}