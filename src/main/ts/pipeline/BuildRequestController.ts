"use strict";

import {PipelineController} from './PipelineController';
import {DependencyGraph} from '../types/DependencyGraph';
import {PipelineGraph} from '../types/PipelineGraph';
import {repository} from '../repository';
import {model} from '../model';

import {config} from '../config';

import {Inject} from 'container-ts'

interface ChangeSet {
    repo : string;
    commit : string;
}

export class BuildRequestController {

    @Inject('queuedBuildsRepository')
    buildsRepository : repository.DocumentRepositoryQ<model.Build>;

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepositoryQ<model.Repository>;

    @Inject('dependencyGraphsRepository')
    dependencyGraphs : repository.DocumentRepositoryQ<model.DependencyGraphSchema>;

    @Inject('pipelinesRepository')
    pipelines : repository.DocumentRepositoryQ<model.PipelineSchema>;

    async processBuildRequest(repository : model.Repository, commit? : string) : Promise<model.PipelineSchema> {

        let userId = repository.userId;

        await this.checkRepositoryExists(repository);

        let dependencyGraph = await this.fetchDependencyGraph(userId);

        let subGraph = dependencyGraph.createSubgraph(repository);

        let changeSets : Array<ChangeSet> = [];
        subGraph.getRepos().forEach(repo =>
            changeSets.push({repo : repo.name, commit : repo.name == repository.name ? commit : ''}));

        let jobs = await this.createJobs(userId, changeSets);

        let pipeline = PipelineGraph.fromSchemas(subGraph.getDependencies(), jobs);

        let addedPipeline = await this.pipelines.saveQ(pipeline.createPipelineSchema(userId));

        return addedPipeline[0];
    }

    private async checkRepositoryExists(repository : model.Repository) : Promise<void> {
        let repo = await this.repositories.fetchFirstQ(repository);
        let repositoryExists =  repo != null && repo != undefined;
        if(!repositoryExists) {
            throw new Error('repository ' + repository.name + ' does not exist');
            //TODO: how to make async functions fail with async/await, so they  look like a rejected promise ??
        }
    }

    private async fetchDependencyGraph(userId : string) : Promise<DependencyGraph> {

        let dependencyGraphScheme = await this.dependencyGraphs.fetchFirstQ({userId : userId});

        let repos = await this.repositories.fetchQ({userId : userId}, 1, Number.MAX_SAFE_INTEGER);

        let reposMap : Map<string, model.Repository> = new Map();
        repos.forEach((repo : model.Repository) => reposMap.set(repo.name, repo));

        return DependencyGraph.fromSchemas(dependencyGraphScheme, reposMap);
    }

    private async createJobs(userId : string, changes : Array<ChangeSet>) {

        let builds : Array<model.Build> = [];

        changes.forEach(changeSet =>
                        builds.push(this.createNewBuild(userId, changeSet.repo, changeSet.commit)));

        let insertedBuilds = await this.buildsRepository.saveQ(builds);

        return insertedBuilds;
    }

    private createNewBuild(userId : string, repo : string, commit : string) : model.Build {
        return {
            _id : undefined,
            userId : userId,
            repo : repo,
            status: model.BuildStatus.QUEUED,
            log: null,
            commit : commit,
            requestTimestamp : new Date(),
            processedTimestamp : null,
            finishedTimestamp: null,
            config : null
        };
    }


}