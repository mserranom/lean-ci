import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {BuildScheduler} from '../build/BuildScheduler';
import {api} from '../api';
import {github} from '../github';

var Joi = require('joi');

export class BuildRequests {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('buildScheduler2')
    buildScheduler : BuildScheduler;

    @PostConstruct
    init() {

        let scheduler  = this.buildScheduler;

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
                console.log('sending response');
                res.send(JSON.stringify(buildRequest));
            }
            catch (error) {
                res.status = 500;
                res.send(error);
            }
        });
    }
}