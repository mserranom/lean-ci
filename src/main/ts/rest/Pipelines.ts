"use strict";

import {Inject} from 'container-ts';

import {RequestMapping} from './express_decorators';

import {PipelineController} from '../controllers/PipelineController';
import {model} from '../model';

export class Pipelines {

    @Inject('pipelineController')
    pipelinesController : PipelineController;

    @RequestMapping('GET', '/pipelines/:id', ['userId'])
    getPipeline(id : string, userId : string) : Promise<model.PipelineSchema> {
        return this.pipelinesController.getPipeline(userId, parseInt(id));
    }
}
