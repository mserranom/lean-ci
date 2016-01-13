"use strict";

import {repository} from '../repository';
import {model} from '../model';

import {Inject} from 'container-ts'


export class PipelineController {

    @Inject('pipelinesRepository')
    pipelines : repository.DocumentRepositoryQ<model.PipelineSchema>;

    async getPipeline(userId : string, pipelineId : number) : Promise<model.PipelineSchema> {

        let query = {
            userId : userId,
            _id : pipelineId
        };

        let pipeline = await this.pipelines.fetchFirstQ(query);

        return pipeline;
    }

}
