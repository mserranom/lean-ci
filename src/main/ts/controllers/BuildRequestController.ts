"use strict";

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
    buildsRepository : repository.DocumentRepositoryQ<model.BuildSchema>;

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepositoryQ<model.RepositorySchema>;

    @Inject('dependencyGraphsRepository')
    dependencyGraphs : repository.DocumentRepositoryQ<model.DependencyGraphSchema>;

    @Inject('pipelinesRepository')
    pipelines : repository.DocumentRepositoryQ<model.PipelineSchema>;

    async processBuildRequest(repository : model.RepositorySchema, commit? : string) : Promise<model.PipelineSchema> {

        let userId = repository.userId;

        await this.checkRepositoryExists(repository);

        let dependencyGraph = await this.fetchDependencyGraph(userId);

        let subGraph = dependencyGraph.createSubgraph(repository);

        let changeSets : Array<ChangeSet> = [];
        subGraph.getRepos().forEach(repo =>
            changeSets.push({repo : repo.name, commit : repo.name == repository.name ? commit : ''}));

        let jobs = await this.createJobs(userId, changeSets, repository);

        let pipeline = PipelineGraph.fromSchemas(subGraph.getDependencies(), jobs);

        let schema = pipeline.createPipelineSchema(userId);
        let addedPipeline = await this.pipelines.saveQ(schema);

        return addedPipeline[0];
    }

    private async checkRepositoryExists(repository : model.RepositorySchema) : Promise<void> {
        let repo = await this.repositories.fetchFirstQ(repository);
        let repositoryExists = repo != null && repo != undefined;
        if(!repositoryExists) {
            throw new Error('repository ' + repository.name + ' does not exist');
        }
    }

    private async fetchDependencyGraph(userId : string) : Promise<DependencyGraph> {

        let dependencyGraphScheme = await this.dependencyGraphs.fetchFirstQ({userId : userId});

        let repos = await this.repositories.fetchQ({userId : userId}, 1, Number.MAX_SAFE_INTEGER);

        let reposMap : Map<string, model.RepositorySchema> = new Map();
        repos.forEach((repo : model.RepositorySchema) => reposMap.set(repo.name, repo));

        return DependencyGraph.fromSchemas(dependencyGraphScheme, reposMap);
    }

    private async createJobs(userId : string, changes : Array<ChangeSet>, updatedRepo : model.RepositorySchema) {

        let builds : Array<model.BuildSchema> = [];

        changes.forEach(changeSet =>
                        builds.push(this.createNewBuild(userId, changeSet.repo, changeSet.commit)));

        builds.forEach(build => {
                if(build.repo == updatedRepo.name) {
                    build.status = model.BuildStatus.QUEUED;
                }
            });

        let insertedBuilds = await this.buildsRepository.saveQ(builds);

        return insertedBuilds;
    }

    private createNewBuild(userId : string, repo : string, commit : string) : model.BuildSchema {
        let build = model.newBuildSchema();
        build.userId = userId;
        build.repo = repo;
        build.commit = commit;
        build.status = model.BuildStatus.IDLE;
        build.createdTimestamp = new Date();
        return build;
    }


}
