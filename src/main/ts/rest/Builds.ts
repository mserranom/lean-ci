import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {BuildQueue} from '../build/BuildQueue';
import {api} from '../api';
import {github} from '../github';

var Joi = require('joi');

export class Builds {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('buildQueue')
    buildQueue : BuildQueue;

    @PostConstruct
    init() {

        let queue = this.buildQueue;

        let repositoryPostValidator =  {
            body: { repo : Joi.string().required(),
                    commit : Joi.string()}
        };

        this.expressServer.post('/builds', repositoryPostValidator, async function(req,res, userId : string) {
            let repoName : string = req.body.repo;
            let commit : string = req.body.commit;

            try {
                let buildRequest = await queue.addBuildToQueue(userId, repoName, commit);
                res.send(JSON.stringify(buildRequest));
            } catch (error) {
                res.status(500).send(error);
            }
        });

        this.expressServer.get('/builds/:id', async function(req,res, userId : string) {
            let id : string = req.params.id;

            try {
                let buildRequest = await queue.getBuild(userId, id);
                res.send(JSON.stringify(buildRequest));
            } catch (error) {
                res.status(500).send(error);
            }
        });

        this.expressServer.getPaged('/builds', async function(req,res, userId : string, page : number, perPage : number) {
            let statusQuery : string = req.query.status;

            try {
                let buildRequests : Array<model.Build>;

                if(statusQuery === 'success') {
                    buildRequests = await queue.successfulBuilds(userId, page, perPage);
                } else  if(statusQuery === 'failed') {
                    buildRequests = await queue.failedBuilds(userId, page, perPage);
                } else if(statusQuery == 'running') {
                    buildRequests = await queue.runningBuilds(userId, page, perPage);
                } else {
                    buildRequests = await queue.queuedBuilds(userId, page, perPage);
                }

                res.send(JSON.stringify(buildRequests));
            } catch (error) {
                res.status(500).send(error);
            }
        });

        this.expressServer.getPaged('/queued_builds', async function(req,res, userId : string, page : number, perPage : number) {
            try {
                let buildRequests = await queue.queuedBuilds(userId, page, perPage);
                res.send(JSON.stringify(buildRequests));
            } catch (error) {
                res.status(500).send(error);
            }
        });

        this.expressServer.getPaged('/running_builds', async function(req,res, userId : string, page : number, perPage : number) {
            try {
                let buildRequests = await queue.runningBuilds(userId, page, perPage);
                res.send(JSON.stringify(buildRequests));
            } catch (error) {
                res.status(500).send(error);
            }
        });

        this.expressServer.getPaged('/finished_builds', async function(req,res, userId : string, page : number, perPage : number) {
            let statusQuery : string = req.query.status;

            try {
                let buildRequests : Array<model.Build>;

                if(statusQuery === 'success') {
                    buildRequests = await queue.successfulBuilds(userId, page, perPage);
                } else  if(statusQuery === 'failed') {
                    buildRequests = await queue.failedBuilds(userId, page, perPage);
                } else {
                    buildRequests = await queue.finishedBuilds(userId, page, perPage);
                }
                res.send(JSON.stringify(buildRequests));
            } catch (error) {
                res.status(500).send(error);
            }
        });
    }
}