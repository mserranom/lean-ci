"use strict";

import {doGet, doPost, doDel, USER_ID} from './Requester';
import {model} from '../../../../src/main/ts/model';

var expect = require('chai').expect;

export class AppDriver {

    async createRepositories(...names : string[]) : Promise<Array<model.RepositorySchema>> {

        for(let i = 0; i < names.length; i++) {
            await doPost('/repositories', {name : names[i]});
        }

        return await doGet('/repositories');
    }

    async getDependencyGraph() : Promise<model.DependencyGraphSchema> {
        let graphs : Array<model.DependencyGraphSchema> = await doGet('/dependency_graphs');
        expect(graphs.length).equals(1);
        return graphs[0];
    }

    async requestBuild(repo : string, commit : string) : Promise<model.PipelineSchema> {
        let pipeline : model.PipelineSchema = await doPost('/build_requests', {repo : repo, commit : commit});
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);
        return pipeline;
    }

    async getBuild(id : number) : Promise<model.BuildSchema> {
        let build : model.BuildSchema = await doGet('/builds/' + id);
        expect(build._id).equals(id);
        return build;
    }

    async getPipeline(id : number) : Promise<model.PipelineSchema> {
        let pipeline : model.PipelineSchema = await doGet('/pipelines/' + id);
        expect(pipeline._id).equals(id);
        return pipeline;
    }


}
