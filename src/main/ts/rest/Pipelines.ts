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

    @RequestMapping('GET', '/pipelines', ['userId'])
    getPipelines(userId : string, page : string, perPage : string) : Promise<Array<model.PipelineSchema>> {
        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);
        return this.pipelinesController.getPipelines(userId, intPage, intPerPage);
    }

    @RequestMapping('GET', '/active_pipelines', ['userId'])
    getActivePipelines(userId : string, page : string, perPage : string) : Promise<Array<model.PipelineSchema>> {
        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);
        return this.pipelinesController.getActivePipelines(userId, intPage, intPerPage);
    }

    @RequestMapping('GET', '/finished_pipelines', ['userId'])
    getFinshedPipelines(userId : string, page : string, perPage : string) : Promise<Array<model.PipelineSchema>> {
        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);
        return this.pipelinesController.getFinishedPipelines(userId, intPage, intPerPage);
    }
}
