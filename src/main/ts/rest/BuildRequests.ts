import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {BuildRequestController} from '../pipeline/BuildRequestController';
import {api} from '../api';

var Joi = require('joi');

export class BuildRequests {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('buildRequestController')
    buildRequestController : BuildRequestController;

    @PostConstruct
    init() {

        let buildRequest = this.buildRequestController;

        let buildRequestValidator =  {
            body: { repo : Joi.string().required(),
                    commit : Joi.string()}
        };

        this.expressServer.post('/build_requests', buildRequestValidator, async function(req,res, userId : string) {

            let repoName : string = req.body.repo;
            let commit : string = req.body.commit;

            try {
                let pipeline = await buildRequest.processBuildRequest({name : repoName, userId : userId}, commit);
                res.send(pipeline);
            } catch (error) {
                res.status(500).send(error);
            }
        });
    }
}