"use strict";

import {doGet, doPost, doDel, USER_ID} from './Requester';
import {model} from '../../../../src/main/ts/model';
import {Container} from 'container-ts';
import {repository} from '../../../../src/main/ts/repository';

var expect = require('chai').expect;

export class AppDriver {

    private _app : Container;

    constructor(app : Container) {
        this._app = app;
    }

    async createRepositories(...names : string[]) : Promise<Array<model.RepositorySchema>> {

        for(let i = 0; i < names.length; i++) {
            await doPost('/repositories', {name : names[i]});
        }

        let allRepos : Array<model.RepositorySchema> =  await doGet('/repositories');
        let newRepos = allRepos.filter(repo => names.some(name => repo.name == name));

        expect(names.length).equals(newRepos.length);
        names.forEach(name => expect(allRepos.some(repo => repo.name == name)).to.be.true);

        return newRepos;
    }

    async getDependencyGraph() : Promise<model.DependencyGraphSchema> {
        let graphs : Array<model.DependencyGraphSchema> = await doGet('/dependency_graphs');
        expect(graphs.length).equals(1);
        return graphs[0];
    }

    async requestBuild(repo : string, commit : string) : Promise<model.PipelineSchema> {
        let pipeline : model.PipelineSchema = await doPost('/build_requests', {repo : repo, commit : commit});
        expect(pipeline.userId).equals(USER_ID);
        expect(pipeline).not.to.be.null;
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);
        return pipeline;
    }

    async getBuild(id : number) : Promise<model.BuildSchema> {
        let build : model.BuildSchema = await doGet('/builds/' + id);
        expect(build.userId).equals(USER_ID);
        expect(build).not.to.be.null;
        expect(build._id).equals(id);
        return build;
    }

    async getPipeline(id : number) : Promise<model.PipelineSchema> {
        let pipeline : model.PipelineSchema = await doGet('/pipelines/' + id);
        expect(pipeline.userId).equals(USER_ID);
        expect(pipeline).not.to.be.null;
        expect(pipeline._id).equals(id);
        return pipeline;
    }

    async getActivePipelines() : Promise<Array<model.PipelineSchema>> {
        let pipelines : Array<model.PipelineSchema> = await doGet('/active_pipelines');
        return pipelines;
    }

    async getFinishedPipelines() : Promise<Array<model.PipelineSchema>> {
        let pipelines : Array<model.PipelineSchema> = await doGet('/finished_pipelines');
        return pipelines;
    }

    async updateBuildStatus(buildId : string, status : model.BuildStatus) : Promise<void> {
        await doPost('/update_build_status', {buildId : buildId, status : status});
    }

    async debugUpdatePipelineAsFinishedSuccesfully(id : string) : Promise<void> {
        let pipeline = await this.getPipeline(parseInt(id));
        pipeline.status = model.PipelineStatus.SUCCESS;

        let repo : repository.DocumentRepositoryQ<model.PipelineSchema> = this._app.get('pipelinesRepository');
        expect(repo).not.to.be.null;
        await repo.updateQ({_id : pipeline._id}, pipeline);

        let finishedPipelines = await this.getFinishedPipelines();
        expect(finishedPipelines.some(x => x._id == id))
    }

}
