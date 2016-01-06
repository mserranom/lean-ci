"use strict";

import {Inject} from '../../../../lib/container';
import {RequestMapping, Middleware} from './express_decorators';
import {model} from '../model';
import {BuildRequestController} from '../pipeline/BuildRequestController';

var Joi = require('joi');
var validate = require('express-validation');

let buildRequestValidator = validate( {
        body: { repo : Joi.string().required(),
                commit : Joi.string()}
    });

export interface CommitInfo {
    repo : string;
    commit : string;
}

export class BuildRequests {

    @Inject('buildRequestController')
    buildRequestController : BuildRequestController;


    @RequestMapping('POST', '/build_requests', ['userId'] )
    @Middleware(buildRequestValidator)
    processRequest(userId : string, commitInfo : CommitInfo) : Promise<model.PipelineSchema> {
        return this.buildRequestController.processBuildRequest({name : commitInfo.repo, userId : userId}, commitInfo.commit);
    }
}