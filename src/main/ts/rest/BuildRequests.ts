import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {BuildQueue} from '../build/BuildQueue';
import {api} from '../api';
import {github} from '../github';

var Joi = require('joi');

export class BuildRequests {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('buildQueue')
    buildQueue : BuildQueue;

    @PostConstruct
    init() {

        let queue  = this.buildQueue;

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

        this.expressServer.getPaged('/builds', async function(req,res, userId : string, page : number, perPage : number) {
            try {
                let buildRequests = await queue.queuedBuilds(userId, page, perPage);
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
    }
}