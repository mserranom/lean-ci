"use strict";

import {repository} from '../repository';
import {model} from '../model';

import {Inject} from 'container-ts'


export class PipelineController {

    @Inject('pipelinesRepository')
    pipelines : repository.DocumentRepositoryQ<model.PipelineSchema>;

    @Inject('queuedBuildsRepository')
    buildsRepository : repository.DocumentRepositoryQ<model.BuildSchema>;

    async getPipeline(userId : string, pipelineId : number) : Promise<model.PipelineSchema> {

        let query = {
            userId : userId,
            _id : pipelineId
        };

        let pipeline = await this.pipelines.fetchFirstQ(query);

        return pipeline;
    }

    async getPipelines(userId : string, page : number, perPage : number) : Promise<Array<model.PipelineSchema>> {

        let query = {
            userId : userId,
        };

        let pipelines = await this.pipelines.fetchQ(query, page, perPage);
        return pipelines;
    }

    async getActivePipelines(userId : string, page : number, perPage : number) : Promise<Array<model.PipelineSchema>> {

        let query = {
            userId : userId,
            status : model.PipelineStatus.RUNNING,
        };

        let pipelines = await this.pipelines.fetchQ(query, page, perPage);
        return pipelines;
    }

    async getFinishedPipelines(userId : string, page : number, perPage : number) : Promise<Array<model.PipelineSchema>> {

        let query = {
            userId : userId,
            $or: [ { status: model.PipelineStatus.SUCCESS },
                   { status: model.PipelineStatus.FAILED }],
        };

        let pipelines = await this.pipelines.fetchQ(query, page, perPage);
        return pipelines;
    }

    async getBuildsForPipeline(userId : string, pipelineId : string) : Promise<Array<model.BuildSchema>> {

        let pipeline = await this.getPipeline(userId, parseInt(pipelineId));
        let query = { _id : { $in : pipeline.jobs }, userId : userId };
        return await this.buildsRepository.fetchQ(query, 1, Number.MAX_SAFE_INTEGER);
    }

    async findPipelineForBuild(userId:string, buildId:String) : Promise<model.PipelineSchema> {
        const allActivePipelines = await this.getActivePipelines(userId,1, Number.MAX_SAFE_INTEGER);
        const pipeline = allActivePipelines.find(pipeline => pipeline.jobs.some(job => job == buildId));
        if(!pipeline) {
            throw new Error("couldn't find the pipeline for the build " + buildId);
        }
        return pipeline;
    }

    async savePipeline(userId : string, pipeline : model.PipelineSchema) : Promise<void> {
        let query = {_id : pipeline._id, userId : userId};
        await this.pipelines.updateQ(query, pipeline);
    }

}
