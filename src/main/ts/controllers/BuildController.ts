"use strict";

import {model} from '../model';
import {repository} from '../repository';
import {config} from '../config';

import {Inject} from 'container-ts'

import * as Q from 'q';

export interface BuildQueue {
    getBuild(userId : string, buildId : string);
    getBuilds(userId : string, page : number, perPage : number, status : model.BuildStatus) : Q.Promise<Array<model.BuildSchema>>;
    getNextQueuedBuild(userId : string);
    saveBuilds(builds : Array<model.BuildSchema>) : Promise<any>;
}

const NEWEST_FIRST = -1;
const OLDEST_FIRST = 1;

export class PersistedBuildQueue implements BuildQueue {

    @Inject('queuedBuildsRepository')
    buildsRepository : repository.DocumentRepositoryQ<model.BuildSchema>;

    getBuild(userId : string, buildId : string) {
        return this.buildsRepository.fetchFirstQ({userId : userId, _id : buildId});
    }

    getBuilds(userId : string, page : number, perPage : number, status : model.BuildStatus) : Q.Promise<Array<model.BuildSchema>> {

        let query = {userId : userId};

        if(status) {
            query['status'] = status;
        }

        let cursorFn;
        if(status == model.BuildStatus.SUCCESS || status == model.BuildStatus.FAILED) {
            cursorFn = cursor => cursor.sort({'finishedTimestamp' : NEWEST_FIRST});
        } else if(status == model.BuildStatus.RUNNING) {
            cursorFn = cursor => cursor.sort({'startedTimestamp' : NEWEST_FIRST});
        } else if(status == model.BuildStatus.IDLE || status == model.BuildStatus.SKIPPED) {
            cursorFn = cursor => cursor.sort({'finishedTimestamp': NEWEST_FIRST});
        } else if(status == model.BuildStatus.QUEUED) {
            cursorFn = cursor => cursor.sort({'queuedTimestamp': OLDEST_FIRST});
        }

        return this.buildsRepository.fetchQ(query, page, perPage, cursorFn);
    }

    async getNextQueuedBuild(userId : string) {
        let builds = await this.getBuilds(userId, 1, 1, model.BuildStatus.QUEUED);
        return builds[0];
    }

    saveBuilds(builds : Array<model.BuildSchema>) : Promise<any> {
        let promises : Array<any> = [];

        for(let i = 0; i < builds.length; i++) {
            let query = {_id : builds[i]._id, userId : builds[i].userId};
            promises.push(this.buildsRepository.updateQ(query, builds[i]));
        }

        return Promise.all(promises);
    }
}
