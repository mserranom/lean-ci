import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {BuildScheduler} from '../build/BuildScheduler';
import {BuildQueue} from '../build/BuildQueue';
import {api} from '../api';
import {github} from '../github';

var Joi = require('joi');

export class BuildRequests {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('buildScheduler2')
    buildScheduler : BuildScheduler;

    @Inject('buildQueue2')
    buildQueue : BuildQueue;

    @PostConstruct
    init() {

        let scheduler  = this.buildScheduler;
        let queue  = this.buildQueue;

        let repositoryPostValidator =  {
            body: { repo : Joi.string().required(),
                    commit : Joi.string()}
        };

        this.expressServer.post('/build_requests', repositoryPostValidator, async function(req,res) {
            let userId = req.get('x-lean-ci-user-id');
            let repoName : string = req.body.repo;
            let commit : string = req.body.commit;

            try {
                let buildRequest = await scheduler.queueBuild(userId, repoName, commit);
                res.send(JSON.stringify(buildRequest));
            } catch (error) {
                res.status = 500;
                res.send(error);
            }
        });

        this.expressServer.get('/build_requests', async function(req,res) {
            let userId = req.get('x-lean-ci-user-id');

            try {
                let buildRequests = await queue.scheduledBuilds(1, 10);
                res.send(JSON.stringify(buildRequests));
            } catch (error) {
                res.status = 500;
                res.send(error);
            }
        });
    }
}