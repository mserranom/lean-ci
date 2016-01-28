"use strict";

import {Inject} from 'container-ts'

import {repository} from '../repository';
import {model} from '../model';
import {BuildQueue} from './BuildController';
import {PipelineController} from './PipelineController';
import {PipelineGraph} from '../types/PipelineGraph';

export class BuildResultController {

    @Inject('buildQueue')
    buildController : BuildQueue;

    @Inject('pipelineController')
    pipelineController : PipelineController;

    @Inject('pipelinesRepository')
    pipelinesRepository : repository.DocumentRepositoryQ<model.PipelineSchema>;

    async updateBuildStatus(userId : string, buildId : string, newStatus : model.BuildStatus) : Promise<model.BuildSchema> {

        await this.checkUpdateIsValid(userId, buildId, newStatus);

        const pipeline = await this.pipelineController.findPipelineForBuild(userId, buildId);
        const builds = await this.pipelineController.getBuildsForPipeline(userId, pipeline._id);

        const updatedBuild = builds.find(build => build._id == buildId);
        this.updateBuild(updatedBuild, newStatus);

        const graph : PipelineGraph = PipelineGraph.fromSchemas(pipeline.dependencies, builds);

        if(newStatus == model.BuildStatus.SUCCESS || newStatus == model.BuildStatus.FAILED) {
            graph.updateIdleCandidatesToQueued();
        }

        if(!graph.hasRunningOrQueuedBuilds()) {
            graph.skipRemainingBuilds();
            pipeline.status = graph.isSuccesful() ? model.PipelineStatus.SUCCESS : model.PipelineStatus.FAILED;
            pipeline.finishedTimestamp = new Date();
            await this.pipelineController.savePipeline(userId, pipeline);
        }

        await this.buildController.saveBuilds(builds);

        return updatedBuild;
    }

    private async checkUpdateIsValid(userId : string, buildId : string, newStatus : model.BuildStatus) : Promise<void> {

        const buildToUpdate = await this.buildController.getBuild(userId, buildId);
        const oldStatus = buildToUpdate.status;

        if(!model.isValidBuildStatusTransition(oldStatus, newStatus)) {
            throw new Error(`status transition from ${oldStatus} to ${newStatus} is not valid`);
        }
    }

    private updateBuild(build : model.BuildSchema, newStatus : model.BuildStatus) : void {
        if(newStatus == model.BuildStatus.SUCCESS
            || newStatus == model.BuildStatus.FAILED
            ||  newStatus == model.BuildStatus.SKIPPED) {
            build.finishedTimestamp = new Date();
        } else if(newStatus == model.BuildStatus.RUNNING) {
            build.startedTimestamp = new Date();
        }
        build.status = newStatus;
    }

}
