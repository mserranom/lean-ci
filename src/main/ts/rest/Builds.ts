"use strict";

import {Inject} from 'container-ts';

import {RequestMapping, Middleware} from './express_decorators';

import {BuildQueue} from '../controllers/BuildController';
import {BuildResultController} from '../controllers/BuildResultController';
import {model} from '../model';
import {auth} from '../auth';

var Joi = require('joi');
var validate = require('express-validation');

let commitInfoValidator = validate( {
    body: { repo : Joi.string().required(),
            commit : Joi.string()}
});

let statusUpdateInfoValidator = validate( {
    body: { buildId : Joi.string().required(),
            status : Joi.string().required()}
});

export interface CommitInfo {
    repo : string;
    commit : string;
}

export interface StatusUpdateInfo {
    buildId : string;
    status : model.BuildStatus;
}

export class Builds {

    @Inject('buildQueue')
    buildQueue : BuildQueue;

    @Inject('buildResultController')
    buildResultController : BuildResultController;

    @RequestMapping('GET', '/builds/:id', ['userId'])
    getBuild(id : string, userId : string) : Promise<model.BuildSchema> {
        return this.buildQueue.getBuild(userId, id);
    }

    @RequestMapping('GET', '/next_queued_build')
    @Middleware(auth.privateApiAuth)
    getNextQueuedBuild() : Promise<model.BuildSchema> {
        return this.buildQueue.getNextQueuedBuild();
    }

    @RequestMapping('GET', '/builds', ['userId','page','per_page', 'status'])
    getBuilds(userId : string, page : string, perPage : string, status : string) : Q.Promise<Array<model.BuildSchema>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        return this.buildQueue.getBuilds(userId, intPage, intPerPage, status);
    }

    @RequestMapping('POST', '/update_build_status', ['userId'])
    @Middleware(statusUpdateInfoValidator)
    updateBuildStatus(userId : string, updateInfo : StatusUpdateInfo) : Promise<model.BuildSchema> {
        return this.buildResultController.updateBuildStatus(userId, updateInfo.buildId, updateInfo.status);
    }

}
