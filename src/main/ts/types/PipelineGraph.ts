///<reference path="../../../../lib/graphlib.d.ts"/>

"use strict";

var Graphlib = require('graphlib');

import {model} from '../model';
import {DependencyGraph} from './DependencyGraph';

export class PipelineGraph {

    private _graph : Graphlib.Graph<model.BuildSchema, void>;

    private _dependencies : Array<model.Dependency>;

    private _builds : Array<model.BuildSchema>;

    static fromSchemas(dependencies : Array<model.Dependency>, jobs : Array<model.BuildSchema>) : PipelineGraph {

        let options = { directed: true, compound: false, multigraph: false };
        let graph : Graphlib.Graph<model.BuildSchema, void> = new Graphlib.Graph(options);

        jobs.forEach((job : model.BuildSchema) => {
            graph.setNode(job._id, job);
        });

        let jobsByRepo : Map<string, model.BuildSchema> = new Map();
        jobs.forEach(job => jobsByRepo.set(job.repo, job));

        dependencies.forEach((dependency : model.Dependency) => {
            if(jobsByRepo.has(dependency.up) && jobsByRepo.has(dependency.down)) {
                graph.setEdge(jobsByRepo.get(dependency.up)._id, jobsByRepo.get(dependency.down)._id);
            }
        });

        if(!Graphlib.alg.isAcyclic(graph)) {
            throw new Error('pipeline graph contains circular dependencies:' + JSON.stringify(Graphlib.json.write(graph)));
        }

        if(graph.sources().length > 1) {
            throw new Error('pipeline graph has more than one source nodes: ' + JSON.stringify(Graphlib.json.write(graph)));
        }

        let pipelineGraph = new PipelineGraph();
        pipelineGraph._graph = graph;
        pipelineGraph._dependencies = dependencies;
        pipelineGraph._builds = jobs;

        return pipelineGraph;

    }

    //TODO: remove from here
    createPipelineSchema(userId : string) : model.PipelineSchema {
        return {
            _id : undefined,
            userId : userId,
            status :  model.PipelineStatus.RUNNING,
            jobs : this._graph.nodes(),
            dependencies : this._dependencies
        }
    }

    getBuilds() : Array<model.BuildSchema> {
        return this._builds;
    }

    updateIdleCandidatesToQueued() : void {
        let nextCandidateToBeQueued = this.nextQueueCandidate();
        if(nextCandidateToBeQueued) {
            nextCandidateToBeQueued.status = model.BuildStatus.QUEUED;
            this.updateIdleCandidatesToQueued();
        }
    }

    skipRemainingBuilds() : void {
        this._builds.forEach(build => {
            if(build.status == model.BuildStatus.IDLE || build.status == model.BuildStatus.QUEUED) {
                build.status = model.BuildStatus.SKIPPED;
            }
        });
    }

    hasRunningOrQueuedBuilds() : boolean {
        return this._builds.some(
            build => (build.status == model.BuildStatus.RUNNING || build.status == model.BuildStatus.QUEUED))
    }

    isSuccesful() : boolean {
        return this._builds.every(build => build.status == model.BuildStatus.SUCCESS)
    }

    nextQueueCandidate() : model.BuildSchema {

        let source:model.BuildSchema = this._graph.sources()[0];
        let nodesSorted = this.nodesSortedByDistance(this._graph, source);

        // iterates over all the jobs by closest distance from source
        for(let i = 0; i < nodesSorted.length; i++) {

            let nodeId = nodesSorted[i];
            let job : model.BuildSchema = this._graph.node(nodeId);

            // the next job to be queued has to be currently idle
            if(!(job.status == model.BuildStatus.IDLE)) {
                continue;
            }

            // we move the jobs only when all the previous builds succeeded
            let predecessorsIds : Array<string> = this._graph.predecessors(nodeId);
            let predecessorsFinished = predecessorsIds.every(id => this._graph.node(id).status == model.BuildStatus.SUCCESS);

            if(predecessorsFinished) {
                return job;
            }

        }

        return null;
    }

    private nodesSortedByDistance(graph : Graphlib.Graph<any, any>, source : any) : Array<any> {
        let distances = Graphlib.alg.dijkstra(graph, source);
        let nodes:Array<any> = [];

        for (var prop in distances) {
            if (distances.hasOwnProperty(prop)) {
                let distanceToSource = distances[prop].distance;
                if(distanceToSource == Number.POSITIVE_INFINITY) {
                    throw new Error('pipeline graph contains unconnected nodes: ' + Graphlib.Json.write(graph));
                }
                nodes.push({nodeId : prop, distance: distanceToSource})
            }
        }

        let sortByDistance = (node1, node2) => { return node1.distance - node2.distance };

        let sortedNodes = nodes.sort(sortByDistance);

        return sortedNodes.map((item) => {return item.nodeId});
    }



}
