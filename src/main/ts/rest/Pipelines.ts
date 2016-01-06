"use strict";

import {Inject} from '../../../../lib/container';

import {RequestMapping} from './express_decorators';

import {PipelineController} from '../pipeline/PipelineController';
import {model} from '../model';

export class Pipelines {

    @Inject('pipelineController')
    pipelinesController : PipelineController;

    @RequestMapping('GET', '/pipelines/:id', ['userId'])
    getPipeline(id : string, userId : string) : Promise<model.PipelineSchema> {
        return this.pipelinesController.getPipeline(userId, parseInt(id));
    }
}