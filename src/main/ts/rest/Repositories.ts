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
    repositories : repository.DocumentRepositoryQ<model.Repository>;

    @Inject('dependencyGraphsRepository')
    dependencyGraphs : repository.DocumentRepositoryQ<model.DependencyGraphSchema>;

    @Inject('githubApi')
    github : github.GitService;

    @RequestMapping('GET', '/repositories', ['userId', 'page', 'per_page'])
    getRepositories(userId : string, page : string, perPage : string) : Q.Promise<Array<model.Repository>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        return this.repositories.fetchQ({userId : userId}, intPage, intPerPage,
            cursor => cursor.sort({'finishedTimestamp' : -1}));
    }

    @RequestMapping('GET', '/repositories/:id', ['userId'])
    getRepository(id:string, userId : string) : Q.Promise<model.Repository> {
        return this.repositories.fetchFirstQ({userId : userId, _id : id});
    }

    @RequestMapping('DELETE', '/repositories/:id', ['userId'])
    deleteRepository(id:string, userId : string) : Q.Promise<void> {
        return this.repositories.removeQ({userId : userId, _id : id});
        //TODO: handle dependency graph
    }

    @RequestMapping('POST', '/repositories', ['userId'])
    @Middleware(repositoryPostValidator)
    async createRepository(userId : string, repo : NewRepositoryInfo) : Promise<void> {
        var data : model.Repository = {name : repo.name, userId : userId};

        let existingRepo = await this.repositories.fetchFirstQ(data);

        if(existingRepo) {
            return;
        }

        let configFileContent : string;

        await this.github.getRepo(repo.name); //checks if repo exists in github

        configFileContent = await this.github.getFile(repo.name, 'leanci.json');

        await this.saveNewRepo(data, JSON.parse(configFileContent));
    }

    private async saveNewRepo(repo : model.Repository, config : model.BuildConfig) {
        await this.repositories.saveQ(repo);

        let graphSchema = await this.dependencyGraphs.fetchFirstQ({userId : repo.userId});

        if(!graphSchema) {
            await this.createNewDependencyGraph(repo, config);
        } else {
            await this.addRepoToDependencyGraph(graphSchema, repo, config.dependencies);
        }
    }

    private async createNewDependencyGraph(repo : model.Repository, config : model.BuildConfig) {
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

    private async addRepoToDependencyGraph(graphSchema : model.DependencyGraphSchema, repo : model.Repository, dependencies : Array<string>) {

        graphSchema.repos.push(repo.name);

        let allRepos = await this.repositories.fetchQ({userId : graphSchema.userId}, 1, Number.MAX_SAFE_INTEGER);

        let graph = DependencyGraph.fromSchemas(graphSchema, this.createRepoMapFromArray(allRepos));

        graph.updateDependencies(repo, dependencies);

        let graphSchemaObject = graph.createDependencySchema(graphSchema.userId, graphSchema._id);

        await this.dependencyGraphs.updateQ({_id : graphSchema._id}, graphSchemaObject);
    }

    private createRepoMapFromArray(repos : Array<model.Repository>) : Map<string, model.Repository> {
        let reposMap : Map<string, model.Repository> = new Map();
        repos.forEach(repo => reposMap.set(repo.name, repo));
        return reposMap;
    }
}