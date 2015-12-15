///<reference path="../../../lib/graphlib.d.ts"/>

import {model} from './model';

var Graphlib = require('graphlib');

export function createDependencyGraphFromSchema(data : model.DependencyGraphSchema,
                                                repos : Map<string, model.Repository>) : Graphlib.Graph<model.Repository, void> {
    let options = { directed: true, compound: false, multigraph: false };
    let graph : Graphlib.Graph<model.Repository, void> = new Graphlib.Graph(options);

    data.repos.forEach((repoName : string) => {
        let repo = repos.get(repoName);
        if(!repo) {
            throw `cannot create dependency graph, repository ${repoName} not found`;
        }
        graph.setNode(repoName, repo);
    });

    data.dependencies.forEach((dependency : model.Dependency) => {
        if(repos.has(dependency.up) && repos.has(dependency.down)) {
            graph.setEdge(dependency.up, dependency.down);
        }
    });

    if(!Graphlib.alg.isAcyclic(graph)) {
        throw 'cannot create dependency graph, contains circular dependencies: ' + JSON.stringify(data);
    }

    return graph;
}

export function createDependencySchemaFromGraph(graph : Graphlib.Graph<model.Repository, void>, _id : string, userId : string) : model.DependencyGraphSchema {
    let result : model.DependencyGraphSchema ={
        _id : _id,
        userId : userId,
        repos : graph.nodes(),
        dependencies : []
    };
    graph.edges().forEach((edge) => result.dependencies.push({up : edge.v, down : edge.w}));
    return result;
}

export function createBuildPipelineGraphFromSchema(data : model.PipelineSchema, jobs : Map<string, model.Job>) : Graphlib.Graph<model.Job, void> {
    let options = { directed: true, compound: false, multigraph: false };
    let graph : Graphlib.Graph<model.Job, void> = new Graphlib.Graph(options);

    data.jobs.forEach((jobId : string) => {
        let job = jobs.get(jobId);
        if(!job) {
            throw `cannot create pipeline graph, job ${jobId} not found`;
        }
        graph.setNode(jobId, job);
    });

    data.dependencies.forEach((dependency : model.Dependency) => {
        if(jobs.has(dependency.up) && jobs.has(dependency.down)) {
            graph.setEdge(dependency.up, dependency.down);
        }
    });

    if(!Graphlib.alg.isAcyclic(graph)) {
        throw 'cannot create pipeline graph, contains circular dependencies: ' + JSON.stringify(data);
    }

    if(graph.sources().length > 1) {
        throw 'cannot create pipeline graph, it has more than one source nodes: ' + JSON.stringify(data);
    }

    return graph;
}

export function creatBuildPipelineSchemaFromGraph(graph : Graphlib.Graph<model.Job, void>, _id : string, userId : string, status : model.PipelineStatus) : model.PipelineSchema {
    let result : model.PipelineSchema ={
        _id : _id,
        userId : userId,
        status : status,
        jobs : graph.nodes(),
        dependencies : []
    };
    graph.edges().forEach((edge) => result.dependencies.push({up : edge.v, down : edge.w}));
    return result;
}

export function getDependencySubgraph(graph : Graphlib.Graph<model.Repository, void>,
                                      newSource : model.Repository) : Graphlib.Graph<model.Repository, void> {
    let newGraph = cloneGraph(graph);

    let dijkstraAlgResult = Graphlib.alg.dijkstra(graph, newSource.name); // or floydWarshall might be faster

    let isValidNode = node => {return dijkstraAlgResult.hasOwnProperty(node) && dijkstraAlgResult[node].distance  != "Infinity"};

    graph.nodes().forEach((node) => {
        if(!isValidNode(node)) {
            newGraph.removeNode(node);
        }
    });

    return newGraph;
}

function cloneGraph(graph : Graphlib.Graph<any, any>) : Graphlib.Graph<any, any> {

    let newGraph = new Graphlib.Graph({ directed: graph.isDirected(),
                                        compound: graph.isCompound(),
                                        multigraph: graph.isMultigraph() });

    graph.nodes().forEach(node => newGraph.setNode(node, graph.node(node)));
    graph.edges().forEach((edge : Graphlib.Edge<any>) => newGraph.setEdge(edge.v, edge.w, edge.name));

    return newGraph;
}