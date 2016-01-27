"use strict";

import {Inject} from 'container-ts';

import {RequestMapping, Middleware} from './express_decorators';

import {BuildQueue} from '../controllers/BuildController';
import {BuildResultController} from '../controllers/BuildResultController';
import {model} from '../model';

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

    @RequestMapping('POST', '/builds', ['userId'])
    @Middleware(commitInfoValidator)
    createBuild(userId : string, commitInfo : CommitInfo) : Promise<model.BuildSchema> {
        return this.buildQueue.addBuildToQueue(userId, commitInfo.repo, commitInfo.commit);
    }

    @RequestMapping('GET', '/builds/:id', ['userId'])
    getBuild(id : string, userId : string) : Promise<model.BuildSchema> {
        return this.buildQueue.getBuild(userId, id);
    }

    @RequestMapping('GET', '/builds', ['userId','page','per_page', 'status'])
    getBuilds(userId : string, page : string, perPage : string, status : string) : Q.Promise<Array<model.BuildSchema>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        if(status === 'success') {
            return this.buildQueue.successfulBuilds(userId, intPage, intPerPage);
        } else if(status === 'failed') {
            return this.buildQueue.failedBuilds(userId, intPage, intPerPage);
        } else if(status == 'running') {
            return this.buildQueue.runningBuilds(userId, intPage, intPerPage);
        } else {
            return this.buildQueue.queuedBuilds(userId, intPage, intPerPage);
        }
    }

    @RequestMapping('GET', '/queued_builds', ['userId','page','per_page'])
    getQueuedBuilds(userId : string, page : string, perPage : string) : Q.Promise<Array<model.BuildSchema>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        return this.buildQueue.queuedBuilds(userId, intPage, intPerPage)
    }

    @RequestMapping('GET', '/running_builds', ['userId','page','per_page'])
    getRunningBuilds(userId : string, page : string, perPage : string) : Q.Promise<Array<model.BuildSchema>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        return this.buildQueue.runningBuilds(userId, intPage, intPerPage)
    }

    @RequestMapping('GET', '/finished_builds', ['userId','page','per_page', 'status'])
    getFinishedBuilds(userId : string, page : string, perPage : string, status : string) : Q.Promise<Array<model.BuildSchema>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        if(status === 'success') {
            return this.buildQueue.successfulBuilds(userId, intPage, intPerPage);
        } else if(status === 'failed') {
            return this.buildQueue.failedBuilds(userId, intPage, intPerPage);
        } else {
            return this.buildQueue.finishedBuilds(userId, intPage, intPerPage);
        }
    }

    @RequestMapping('POST', '/update_build_status', ['userId'])
    @Middleware(statusUpdateInfoValidator)
    updateBuildStatus(userId : string, updateInfo : StatusUpdateInfo) : Promise<model.BuildSchema> {
        return this.buildResultController.updateBuildStatus(userId, updateInfo.buildId, updateInfo.status);
    }

}
