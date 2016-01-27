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

    @Inject('queuedBuildsRepository')
    buildsRepository : repository.DocumentRepositoryQ<model.BuildSchema>;

    @Inject('pipelinesRepository')
    pipelinesRepository : repository.DocumentRepositoryQ<model.PipelineSchema>;

    async updateBuildStatus(userId : string, buildId : string, status : model.BuildStatus) : Promise<model.BuildSchema> {

        const updatedBuild = await this.buildController.getBuild(userId, buildId);

        if(updatedBuild.status == status) {
            return updatedBuild;
        }

        this.checkUpdateIsValid(updatedBuild.status, status);

        if(status == model.BuildStatus.RUNNING) {
            return await this.updateSingleBuildStatus(userId, buildId, model.BuildStatus.RUNNING);
        }

        const pipeline = await this.findPipeline(userId, buildId);
        const builds = await this.pipelineController.getBuildsForPipeline(userId, pipeline._id);
        builds.find(build => build._id == buildId).status = status;

        if(status == model.BuildStatus.SUCCESS || status == model.BuildStatus.FAILED) {
            this.updateAllIdleToQueued(pipeline, builds);
        }

        if(!builds.some(build => (build.status == model.BuildStatus.RUNNING || build.status == model.BuildStatus.QUEUED))
             && !builds.every(build => (build.status == model.BuildStatus.SUCCESS))) {

            let allSuccessful = builds.every(build => build.status == model.BuildStatus.SUCCESS);
            pipeline.status = allSuccessful ? model.PipelineStatus.SUCCESS : model.PipelineStatus.FAILED;
            let query = {_id : pipeline._id, userId : userId};
            await this.pipelinesRepository.updateQ(query, pipeline);
        }

        if(pipeline.status == model.PipelineStatus.SUCCESS || pipeline.status == model.PipelineStatus.FAILED) {
            builds.forEach(build => {
               if(build.status == model.BuildStatus.IDLE || build.status == model.BuildStatus.QUEUED) {
                   build.status = model.BuildStatus.SKIPPED;
               }
            });
        }

        await this.persistBuilds(builds)

    }

    private async updateSingleBuildStatus(userId : string, buildId : string, status : model.BuildStatus) : Promise<model.BuildSchema> {
        let build = await this.buildController.getBuild(userId, buildId);
        build.status = status;
        await this.buildsRepository.updateQ({_id : buildId, userId : userId}, build);
        return build;
    }

    private async findPipeline(userId:string, buildId:String) : Promise<model.PipelineSchema> {
        const allActivePipelines = await this.pipelineController.getActivePipelines(userId,1, Number.MAX_SAFE_INTEGER);
        const pipeline = allActivePipelines.find(pipeline => pipeline.jobs.some(job => job == buildId));
        if(!pipeline) {
            throw new Error("couldn't find the pipeline for the build " + buildId);
        }
        return pipeline;
    }

    private checkUpdateIsValid(oldStatus:model.BuildStatus, newStatus:model.BuildStatus):void {

        if(newStatus != model.BuildStatus.RUNNING
            && newStatus != model.BuildStatus.SUCCESS
            && newStatus != model.BuildStatus.FAILED) {

            throw new Error("only status transitions to 'running', 'success' or 'failed' are valid");
        }

        if(newStatus == model.BuildStatus.IDLE
            || (oldStatus == model.BuildStatus.QUEUED && newStatus != model.BuildStatus.IDLE )
            || (oldStatus == model.BuildStatus.RUNNING && newStatus == model.BuildStatus.SUCCESS)
            || (oldStatus == model.BuildStatus.RUNNING && newStatus == model.BuildStatus.FAILED)){

            return;
        }

        throw new Error(`status transition from ${oldStatus} to ${newStatus} is not valid`);
    }

    private updateAllIdleToQueued(pipeline : model.PipelineSchema, builds : Array<model.BuildSchema>) : PipelineGraph {
        const pipelineGraph = PipelineGraph.fromSchemas(pipeline.dependencies, builds);
        let nextCandidateToBeQueued = pipelineGraph.nextIdle();
        if(nextCandidateToBeQueued) {
            nextCandidateToBeQueued.status = model.BuildStatus.QUEUED;
            return this.updateAllIdleToQueued(pipeline, builds);
        } else {
            return pipelineGraph;
        }

    }

    private async persistBuilds(builds : Array<model.BuildSchema>) : Promise<void> {
        let promises : Array<any> = [];

        for(let i = 0; i < builds.length; i++) {
            let query = {_id : builds[i]._id, userId : builds[i].userId};
            promises.push(this.buildsRepository.updateQ(query, builds[i]));
        }

        await Promise.all(promises);
    }
}
