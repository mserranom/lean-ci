///<reference path="../../../../lib/graphlib.d.ts"/>

var Graphlib = require('graphlib');

import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {repository} from '../repository';
import {api} from '../api';
import {github} from '../github';
import {createDependencyGraph, createDependencySchemaFromGraph} from '../graph';

var Joi = require('joi');

export class Repositories {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepository<model.Repository>;

    @Inject('repositoriesRepository')
    repositoriesQ : repository.DocumentRepositoryQ<model.Repository>;

    @Inject('dependencyGraphsRepository')
    dependencyGraphsQ : repository.DocumentRepositoryQ<model.DependencyGraphSchema>;

    @Inject('githubApi')
    github : github.GitService;

    @PostConstruct
    init() {

        let repQ = this.repositoriesQ;
        let depGraphQ = this.dependencyGraphsQ;
        let githubApi = this.github;

        let repositoryPostValidator =  {
            body: { name : Joi.string().required() }
        };


        this.expressServer.post('/repositories', repositoryPostValidator, async function (req,res, userId : string) {
            let repoName : string = req.body.name;
            var data : model.Repository = {name : repoName, userId : userId};

            let existingRepo = await repQ.fetchFirstQ(data);

            if(existingRepo) {
                res.end();
                return;
            }

            let configFileContent : string;

            try {
                await githubApi.getRepo(repoName); //checks if repo exists in github
                configFileContent = await githubApi.getFile(repoName, 'leanci.json');
            } catch (error) {
                res.status(500).send(error);
                return;
            }

            await saveNewRepo(data, JSON.parse(configFileContent));

            res.end();
        });

        async function saveNewRepo(repo : model.Repository, config : model.BuildConfig) {
            let insertResult = await repQ.saveQ(repo);

            let newRepo = insertResult[0];

            let graph = await depGraphQ.fetchFirstQ({userId : newRepo.userId});

            if(!graph) {
                await createNewDependencyGraph(newRepo, config);
            } else {
                await updateDependencyGraph(graph, newRepo, config);
            }
        }

        async function createNewDependencyGraph(repo : model.Repository, config : model.BuildConfig) {
            let data : model.DependencyGraphSchema = {
                _id : undefined,
                userId : repo.userId,
                repos : [repo.name],
                dependencies : createDependenciesFromConfig(repo.name, config)
            };
            await depGraphQ.saveQ(data);
        }

        function createDependenciesFromConfig(repoName : string, config : model.BuildConfig) : Array<model.Dependency> {
            let dependencies : Array<model.Dependency> = [];
            config.dependencies.forEach((depId : string) => dependencies.push({up : depId, down : repoName}));
            return dependencies;
        }

        async function updateDependencyGraph(graphSchema : model.DependencyGraphSchema, repo : model.Repository, config : model.BuildConfig) {
            let repos = await repQ.fetchQ({userId : graphSchema.userId}, 1, Number.MAX_SAFE_INTEGER);

            // generate graph object from graph schema object
            let reposMap : Map<string, model.Repository> = new Map();
            repos.forEach(repo => reposMap.set(repo.name, repo));

            let graph : Graphlib.Graph<model.Repository, void> = createDependencyGraph(graphSchema, reposMap);

            if(!graph.hasNode(repo.name)) {
                graph.setNode(repo.name, repo)
            }

            // remove all the previous dependencies in the graph
            let oldDeps : Array<string> = graph.inEdges(repo.name);
            if(oldDeps && oldDeps.length > 0) {
                oldDeps.forEach(dep => graph.removeEdge(dep, repo.name));
            }

            // set new dependencies
            config.dependencies.forEach(dep => graph.setEdge(dep, repo.name));

            // save graph
            let data = createDependencySchemaFromGraph(graph, graphSchema._id, graphSchema.userId);

            await depGraphQ.updateQ({_id : graphSchema._id}, data);
        }

        this.expressServer.del('/repositories/:id', (req, res, userId:string) => {
            let id : string = req.params.id;

            console.info(`received /repositories/${id} DELETE request`);

            let onResult = () => res.end();

            let onError = (error) => {
                res.status(500).send(error);
            };

            let query : any = {userId : userId, _id : id};

            this.repositories.remove(query, onError, onResult);
        });

        this.expressServer.getPaged('/repositories', async function (req,res, userId : string, page: number, perPage : number) {
            try {
                let repos : Array<model.Repository> = await repQ.fetchQ({userId : userId}, page, perPage,
                    cursor => cursor.sort({'finishedTimestamp' : -1}));
                res.send(JSON.stringify(repos));
            } catch(error) {
                res.status(500).send(error);
            }
        });

        this.expressServer.get('/repositories/:id', (req,res, userId : string) => {
            let id : string = req.params.id;

            let onResult = (data : Array<model.Repository>) => res.send(JSON.stringify(data));
            let onError = (error) => {
                res.status(500).send(error);
            };

            this.repositories.fetchFirst({userId : userId, _id : id}, onError, onResult);
        });
    }
}