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

    @Inject('repositoriesRepository')
    repositoriesQ : repository.DocumentRepositoryQ<model.Repository>;

    @Inject('githubApi')
    github : github.GitService;

    @PostConstruct
    init() {

        let repQ = this.repositoriesQ;
        let githubApi = this.github;

        let repositoryPostValidator =  {
            body: { name : Joi.string().required() }
        };


        this.expressServer.post('/repositories', repositoryPostValidator, async function (req,res, userId : string) {
            let repoName : string = req.body.name;
            var data : model.Repository = {_id : undefined, userId : userId, name : repoName};

            let existingRepo = await repQ.fetchFirstQ(data);

            if(existingRepo) {
                res.end();
                return;
            }

            try {
                await githubApi.getRepo(repoName); //checks if repo exists in github
                await repQ.saveQ(data);
                res.end();
            } catch (error) {
                res.status(500).send(error);
            }
        });

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