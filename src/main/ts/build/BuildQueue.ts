///<reference path="../../../../lib/Q.d.ts"/>

import {model} from '../model';
import {repository} from '../repository';
import {config} from '../config';

import {Inject} from '../../../../lib/container'

var Q = require('q');

export interface BuildQueue {
    addBuildToQueue(userId : string, repo : string, commit? : string); // async
    nextQueuedBuild(userId : string) : Q.Promise<model.Build>;
    updateBuildStatus(userId : string, buildId : string, newStatus : model.BuildStatus); // async
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

        console.log('adding ' + repo  + (commit ? ('@' + commit) : 'HEAD') + ' to the build queue');

        await this.checkRepositoryExists(userId, repo);

        let pingURL = config.appUrl + '/build/pingFinish';
        let request = this.createNewBuildRequest(userId, repo, commit, pingURL);

        return this.buildsRepository.saveQ(request)
            .then(() => { return request });
    }

    private async checkRepositoryExists(userId : string, repo : string) {
        let repository : model.Repository = await this.repositories.fetchFirstQ({userId : userId, name : repo});
        if(!repository) {
            throw repo + 'is not a valid repository';
        }
    }

    private createNewBuildRequest(userId : string, repo : string, commit : string, pingURL : string) : model.Build {
        return {
            _id : undefined,
            userId : userId,
            repo : repo,
            status: model.BuildStatus.QUEUED,
            log: null,
            commit : commit,
            pingURL : pingURL,
            requestTimestamp : new Date(),
            processedTimestamp : null,
            finishedTimestamp: null,
            config : null
        };
    }

    nextQueuedBuild(userId : string) : Q.Promise<model.Build> {
        return this.queuedBuilds(userId, 1, 1).then((items) => { return items[0]});
    }

    async updateBuildStatus(userId : string, buildId : string, newStatus : model.BuildStatus) {
        let build : model.Build = await this.buildsRepository.fetchFirstQ({userId : userId, _id : buildId});
        if(build) {
            build.status = model.BuildStatus.RUNNING;
            await this.buildsRepository.updateQ({status : newStatus}, build)
        } else {
            console.error('couldnt find build with id=' + buildId);
            // TODO: define error in case there's no matching build
        }
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
