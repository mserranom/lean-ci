"use strict";

import {DependencyGraph} from "../types/DependencyGraph";

import {Inject} from 'container-ts';
import {RequestMapping, Middleware} from './express_decorators';
import {model} from '../model';
import {repository} from '../repository';
import {api} from '../api';
import {github} from '../github';

var Joi = require('joi');
var validate = require('express-validation');

let repositoryPostValidator = validate( {
    body: { name : Joi.string().required() }
});

export interface NewRepositoryInfo {
    name : string;
}

export class Repositories {

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepositoryQ<model.RepositorySchema>;

    @Inject('dependencyGraphsRepository')
    dependencyGraphs : repository.DocumentRepositoryQ<model.DependencyGraphSchema>;

    @Inject('gitServiceFactory')
    gitServiceFactory : github.GitServiceFactory;

    @RequestMapping('GET', '/repositories', ['userId', 'page', 'per_page'])
    getRepositories(userId : string, page : string, perPage : string) : Q.Promise<Array<model.RepositorySchema>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        return this.repositories.fetchQ({userId : userId}, intPage, intPerPage,
            cursor => cursor.sort({'finishedTimestamp' : -1}));
    }

    @RequestMapping('GET', '/repositories/:id', ['userId'])
    getRepository(id:string, userId : string) : Q.Promise<model.RepositorySchema> {
        return this.repositories.fetchFirstQ({userId : userId, _id : id});
    }

    @RequestMapping('DELETE', '/repositories', ['userId'])
    async deleteRepository(userId : string, repoSchema : model.RepositorySchema) : Promise<void> {

        let repos = await this.repositories.fetchQ({userId : userId}, 1, Number.MAX_SAFE_INTEGER);

        if(!repos.some(repo => repo.name == repoSchema.name)) {
            return;
        }

        let graphSchema = await this.dependencyGraphs.fetchFirstQ({userId : userId});
        let graph = DependencyGraph.fromSchemas(graphSchema, this.createRepoMapFromArray(repos));

        graph.removeRepo(repoSchema.name);

        await Promise.all([
            this.dependencyGraphs.updateQ({_id : graphSchema._id},
                                            graph.createDependencySchema(userId, graphSchema._id)),
            this.repositories.removeQ({userId : userId, name : repoSchema.name})
        ]);

    }

    @RequestMapping('POST', '/repositories', ['userId', 'githubToken'])
    @Middleware(repositoryPostValidator)
    async createRepository(userId : string, githubToken : string, repo : NewRepositoryInfo) : Promise<void> {
        var data : model.RepositorySchema = {name : repo.name, userId : userId};
        var gitApi = this.gitServiceFactory.getService(githubToken);

        let existingRepo = await this.repositories.fetchFirstQ(data);

        if(existingRepo) {
            return;
        }

        let configFileContent : string;

        try {
            await gitApi.getRepo(repo.name);
        } catch(error) {
            throw new Error(error);
        }

        try {
            //TODO: handle whether the file doesn't exist or it fails to be fetched
            configFileContent = await gitApi.getFile(repo.name, 'leanci.json');
        } catch(error) {
            let msg = `couldn't retrieve leanci.json file from ${repo}`;
            throw new Error(msg);
        }

        await this.saveNewRepo(data, this.wrapBuildConfig(configFileContent));
    }

    private wrapBuildConfig(configFileContent : string) : model.BuildConfig {
        let conf : model.BuildConfig = JSON.parse(configFileContent);
        conf.commands = conf.commands || [];
        conf.dependencies = conf.dependencies || [];
        return conf;
    }

    private async saveNewRepo(repo : model.RepositorySchema, config : model.BuildConfig) {

        await this.repositories.saveQ(repo);

        let graphSchema = await this.dependencyGraphs.fetchFirstQ({userId : repo.userId});

        if(!graphSchema) {
            await this.createNewDependencyGraph(repo, config);
        } else {
            await this.addRepoToDependencyGraph(graphSchema, repo, config.dependencies);
        }
    }

    private async createNewDependencyGraph(repo : model.RepositorySchema, config : model.BuildConfig) {
        let data : model.DependencyGraphSchema = {
            _id : undefined,
            userId : repo.userId,
            repos : [repo.name],
            dependencies : this.createDependenciesFromConfig(repo.name, config)
        };
        await this.dependencyGraphs.saveQ(data);
    }

    private createDependenciesFromConfig(repoName : string, config : model.BuildConfig) : Array<model.Dependency> {
        let dependencies : Array<model.Dependency> = [];

        config.dependencies.forEach((depId : string) => dependencies.push({up : depId, down : repoName}));

        return dependencies;
    }

    private async addRepoToDependencyGraph(graphSchema : model.DependencyGraphSchema, repo : model.RepositorySchema, dependencies : Array<string>) {

        graphSchema.repos.push(repo.name);

        let allRepos = await this.repositories.fetchQ({userId : graphSchema.userId}, 1, Number.MAX_SAFE_INTEGER);

        let graph = DependencyGraph.fromSchemas(graphSchema, this.createRepoMapFromArray(allRepos));

        graph.updateDependencies(repo, dependencies);

        let graphSchemaObject = graph.createDependencySchema(graphSchema.userId, graphSchema._id);

        await this.dependencyGraphs.updateQ({_id : graphSchema._id}, graphSchemaObject);
    }

    private createRepoMapFromArray(repos : Array<model.RepositorySchema>) : Map<string, model.RepositorySchema> {
        let reposMap : Map<string, model.RepositorySchema> = new Map();
        repos.forEach(repo => reposMap.set(repo.name, repo));
        return reposMap;
    }
}
