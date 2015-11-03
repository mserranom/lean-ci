import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {repository} from '../repository';
import {api} from '../api';
import {github} from '../github';

var Joi = require('joi');

export class Repositories {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepository<model.Repository>;

    @Inject('githubApi')
    github : github.GithubAPI;

    @PostConstruct
    init() {

        let repositoryPostValidator =  {
            body: { name : Joi.string().required() }
        };

        this.expressServer.post('/repositories', repositoryPostValidator, (req,res) => {
            let userId = req.get('x-lean-ci-user-id');
            let repoName : string = req.body.name;

            console.info('received /repositories POST request');

            var data : model.Repository = {userId : userId, name : repoName};

            var onError = (error) => {
                res.status = 500;
                res.send(error);
            };

            let saveNewRepo = () => {
                let onResult = () => res.end();
                this.repositories.save(data, onError, onResult);
            };

            this.repositories.fetch(data, 1, 1, onError, (result) => {
                if(result.length > 0) {
                    res.end();
                } else {
                    this.github.getRepo(repoName)
                        .then(saveNewRepo).fail(onError);
                }
            });
        });

        this.expressServer.delete('/repositories/:id', (req,res) => {
            let userId = req.get('x-lean-ci-user-id');
            let id : string = req.params.id;

            console.info(`received /repositories/${id} DELETE request`);

            let onResult = () => res.end();

            let onError = (error) => {
                res.status = 500;
                res.end();
            };

            let query : any = {userId : userId, _id : id};

            this.repositories.remove(query, onError, onResult);
        });

        this.expressServer.get('/repositories', (req,res) => {
            let userId = req.get('x-lean-ci-user-id');
            let onResult = (data : Array<model.Repository>) => res.send(JSON.stringify(data));
            let onError = (error) => {
                res.status = 500;
                res.end();
            };
            let page = req.query.page ? parseInt(req.query.page) : 1;
            let perPage = req.query.page ? parseInt(req.query.per_page) : 10;
            this.repositories.fetch({userId : userId}, page, perPage, onError, onResult,
                cursor => cursor.sort({'finishedTimestamp' : -1}));
        });

        this.expressServer.get('/repositories/:id', (req,res) => {
            let userId = req.get('x-lean-ci-user-id');
            let id : string = req.params.id;

            let onResult = (data : Array<model.Repository>) => res.send(JSON.stringify(data));
            let onError = (error) => {
                res.status = 500;
                res.end();
            };

            this.repositories.fetchFirst({userId : userId, _id : id}, onError, onResult);
        });
    }
}