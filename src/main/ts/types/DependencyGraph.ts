///<reference path="../../../../lib/graphlib.d.ts"/>

"use strict";

var Graphlib = require('graphlib');

import {model} from '../model';
import {cloneGraph} from '../graph';

export class DependencyGraph {

    private _graph : Graphlib.Graph<model.RepositorySchema, void>;

    private _repos : Array<model.RepositorySchema>;
    private _dependencies : Array<model.Dependency>;

    static fromSchemas(data : model.DependencyGraphSchema, repos : Map<string, model.RepositorySchema>) : DependencyGraph {

        let graph = createDependencyGraphFromSchema(data, repos);

        let dependencyGraph = new DependencyGraph();
        dependencyGraph._graph = graph;
        dependencyGraph._repos = [];

        for (var repo of repos.values()) {
            dependencyGraph._repos.push(repo);
        }

        dependencyGraph._dependencies = data.dependencies.concat();

        return dependencyGraph;
    }

    getRepos() : Array<model.RepositorySchema> {
        return this._repos;
    }

    updateDependencies(repo : model.RepositorySchema, dependencies : Array<string>) : void {

        if(!this.hasRepo(repo.name)) {
            throw new Error('cannot update dependencies, repository ' + repo.name + ' does not exist in this dependency graph');
        }

        // remove all the previous dependencies of the node in the graph
        let oldDeps : Array<string> = this._graph.inEdges(repo.name);
        if(oldDeps && oldDeps.length > 0) {
            oldDeps.forEach(dep => this._graph.removeEdge(dep, repo.name));
        }

        dependencies.forEach(dep => this._graph.setEdge(dep, repo.name));

        this._dependencies = dependencies.map(dep => {return {up : dep, down : repo.name} }) ;
    }

    // TODO: probably not needed
    removeRepo(name : string) : void {

        if(this.hasRepo(name)) {
            this._repos = this._repos.filter(repo => repo.name != name);
            this._graph.removeNode(name);
            this._dependencies = this._graph.edges().map(edge => {return {up : edge.v, down : edge.w}});
        }
    }

    private hasRepo(name : string) : boolean {
        return this._repos.some(repo => {return repo.name == name});
    }

    getDependencies() : Array<model.Dependency> {
        return this._dependencies;
    }

    createDependencySchema(userId : string, _id : string) : model.DependencyGraphSchema {

        let result : model.DependencyGraphSchema ={
            _id : _id,
            userId : userId,
            repos : this._graph.nodes(),
            dependencies : []
        };
        this._graph.edges().forEach((edge) => result.dependencies.push({up : edge.v, down : edge.w}));
        return result;
    }

    createSubgraph(repo : model.RepositorySchema) : DependencyGraph {

        let newGraph = cloneGraph(this._graph);

        let dijkstraAlgResult = Graphlib.alg.dijkstra(this._graph, repo.name); // or floydWarshall might be faster

        let isValidNode = node => {return dijkstraAlgResult.hasOwnProperty(node) && dijkstraAlgResult[node].distance  != "Infinity"};

        this._graph.nodes().forEach((node) => {
            if(!isValidNode(node)) {
                newGraph.removeNode(node);
            }
        });

        let newDependencyGraph = new DependencyGraph();
        newDependencyGraph._graph = newGraph;
        newDependencyGraph._repos = newGraph.nodes().map(repoId => {return newGraph.node(repoId)});
        newDependencyGraph._dependencies = newGraph.edges().map((edge) => { return {up : edge.v, down : edge.w} });

        return newDependencyGraph;
    }
}

function createDependencyGraphFromSchema(data : model.DependencyGraphSchema,
                            repos : Map<string, model.RepositorySchema>) : Graphlib.Graph<model.RepositorySchema, void> {

    let options = { directed: true, compound: false, multigraph: false };
    let graph : Graphlib.Graph<model.RepositorySchema, void> = new Graphlib.Graph(options);

    data.repos.forEach((repoName : string) => {
        let repo = repos.get(repoName);
        if(!repo) {
            throw new Error(`cannot create dependency graph, repository ${repoName} not found`);
        }
        graph.setNode(repoName, repo);
    });

    data.dependencies.forEach((dependency : model.Dependency) => {
        if(repos.has(dependency.up) && repos.has(dependency.down)) {
            graph.setEdge(dependency.up, dependency.down);
        }
    });

    if(!Graphlib.alg.isAcyclic(graph)) {
        throw new Error('cannot create dependency graph, contains circular dependencies: ' + JSON.stringify(data));
    }

    return graph;
}
