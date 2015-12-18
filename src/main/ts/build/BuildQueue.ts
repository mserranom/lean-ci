///<reference path="../../../../lib/Q.d.ts"/>

"use strict";

import {model} from '../model';
import {repository} from '../repository';
import {config} from '../config';

import {Inject} from '../../../../lib/container'

var Q = require('q');

export interface BuildQueue {
    // TODO: remove addBuildToQueue() so that the build is queued by the pipeline managers
    addBuildToQueue(userId : string, repo : string, commit? : string); // async
    nextQueuedBuild(userId : string) : Q.Promise<model.Build>;
    getBuild(userId : string, buildId : string); // async
    queuedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>>;
    runningBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>>;
    finishedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>>;
    successfulBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>>;
    failedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>>;
}

export class PersistedBuildQueue implements BuildQueue {

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepositoryQ<model.Repository>;

    @Inject('queuedBuildsRepository')
    buildsRepository : repository.DocumentRepositoryQ<model.Build>;

    async addBuildToQueue(userId : string, repo : string, commit?:string) {
        commit = commit || '';

        await this.checkRepositoryExists(userId, repo);

        let request = this.createNewBuildRequest(userId, repo, commit);

        let insertedBuilds = await this.buildsRepository.saveQ(request);
        return insertedBuilds[0];
    }

    private async checkRepositoryExists(userId : string, repo : string) {
        let repository : model.Repository = await this.repositories.fetchFirstQ({userId : userId, name : repo});
        if(!repository) {
            throw new Error(repo + 'is not a valid repository');
        }
    }

    private createNewBuildRequest(userId : string, repo : string, commit : string) : model.Build {
        return {
            _id : undefined,
            userId : userId,
            repo : repo,
            status: model.BuildStatus.QUEUED,
            log: null,
            commit : commit,
            requestTimestamp : new Date(),
            processedTimestamp : null,
            finishedTimestamp: null,
            config : null
        };
    }

    nextQueuedBuild(userId : string) : Q.Promise<model.Build> {
        return this.queuedBuilds(userId, 1, 1).then((items) => { return items[0]});
    }

    async getBuild(userId : string, buildId : string) {
        return this.buildsRepository.fetchFirstQ({userId : userId, _id : buildId});
    }

    queuedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>> {
        let query = {userId : userId, status : model.BuildStatus.QUEUED};
        return this.buildsRepository.fetchQ(query, page, perPage,
                cursor => cursor.sort({'requestTimestamp' : 'ascending'}));
    }

    runningBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>> {
        let query = {userId : userId, status : model.BuildStatus.RUNNING};
        return this.buildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'processedTimestamp' : 'descending'}));
    }

    successfulBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>> {
        let query = {userId : userId, status : model.BuildStatus.SUCCESS};
        return this.buildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'finishedTimestamp' : 'descending'}));
    }

    failedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>> {
        let query = {userId : userId, status : model.BuildStatus.FAILED};
        return this.buildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'finishedTimestamp' : 'descending'}));
    }

    finishedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.Build>> {
        let query = {userId : userId,
                     $or: [ { status: model.BuildStatus.SUCCESS },
                            { status: model.BuildStatus.FAILED }]};

        return this.buildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'requestTimestamp' : 'descending'}));
    }
}
