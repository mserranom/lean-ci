import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {api} from '../api';
import {PipelineController} from "../pipeline/PipelineController";

var Joi = require('joi');

export class Builds {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('pipelineController')
    pipelinesController : PipelineController;

    @PostConstruct
    init() {

        let pipelines = this.pipelinesController;

        this.expressServer.get('/pipelines/:id', async function(req,res, userId : string) {
            let id : number = parseInt(req.params.id);

            try {
                let buildRequest = pipelines.getPipeline(userId, id);
                res.send(JSON.stringify(buildRequest));
            } catch (error) {
                res.status(500).send(error);
            }
        });

    }
}