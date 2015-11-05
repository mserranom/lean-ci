///<reference path="../../../../lib/Q.d.ts"/>

import {model} from '../model';
import {repository} from '../repository';
import {config} from '../config';

import {Inject} from '../../../../lib/container'

var Q = require('q');

export interface BuildQueue {
    add(repo : model.BuildRequest) : Q.Promise<void>;
    addBuildToQueue(userId : string, repo : string, commit? : string) : Q.Promise<model.BuildRequest>// async
    nextQueuedBuild(userId : string) : Q.Promise<model.BuildRequest>;
    startNextQueuedBuild(userId : string) // async
    start(buildRequestId : string, agentURL : string) : Q.Promise<void>;
    finish(buildResult : model.BuildResult) : Q.Promise<void>;
    queuedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>>;
    runningBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>>;
    finishedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>>;
    successfulBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>>;
    failedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>>;
    activeBuilds(page : number, perPage : number) : Q.Promise<Array<model.ActiveBuild>>;
}

export class PersistedBuildQueue implements BuildQueue {

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepositoryQ<model.Repository>;

    @Inject('queuedBuildsRepository')
    queuedBuildsRepository : repository.DocumentRepositoryQ<model.BuildRequest>;

    @Inject('activeBuildsRepository')
    activeBuildsRepository : repository.DocumentRepositoryQ<model.ActiveBuild>;

    @Inject('buildResultsRepository')
    buildResultsRepository : repository.DocumentRepositoryQ<model.BuildResult>;

    add(repo : model.BuildRequest) : Q.Promise<void>  {
        return this.queuedBuildsRepository.saveQ(repo);
    }

    addBuildToQueue(userId : string, repo : string, commit?:string) : Q.Promise<model.BuildRequest> {
        commit = commit || '';

        console.log('adding ' + repo  + (commit ? ('@' + commit) : 'HEAD') + ' to the build queue');

        let pingURL = config.appUrl + '/build/pingFinish';
        let request = this.createNewBuildRequest(userId, repo, commit, pingURL);

        return this.repositories.fetchFirstQ({name : repo})
            .then(() => { return this.queuedBuildsRepository.saveQ(request) })
            .then(() => { return request });
    }

    private async checkRepositoryExists(userId : string, repo : string) {
        let repository : model.Repository = await this.repositories.fetchFirstQ({userId : userId, name : repo});
        if(repository) {
            throw repo + 'is not a valid repository';
        }
    }

    private createNewBuildRequest(userId : string, repo : string, commit : string, pingURL : string) : model.BuildRequest {
        return {
            id : new Date().getTime() + "-" + Math.floor(Math.random() * 10000000000),
            userId : userId,
            repo : repo,
            status: model.BuildStatus.QUEUED,
            log: null,
            commit : commit,
            pingURL : pingURL,
            requestTimestamp : new Date(),
            processedTimestamp : null,
            finishedTimestamp: null
        };
    }

    nextQueuedBuild(userId : string) : Q.Promise<model.BuildRequest> {
        return this.queuedBuilds(userId, 1, 1).then((items) => { return items[0]});
    }

    async startNextQueuedBuild(userId : string) {
        let build : model.BuildRequest = await this.nextQueuedBuild(userId);
        build.status = model.BuildStatus.RUNNING;
        await this.queuedBuildsRepository.updateQ({_id : build._id}, build)
    }

    start(buildRequestId : string, agentURL : string) : Q.Promise<void> {
        return this.queuedBuildsRepository.fetchFirstQ({id : buildRequestId})
            .then(buildRequest => {
                return Q.all([
                    this.queuedBuildsRepository.removeQ({id : buildRequest.id}),
                    this.activeBuildsRepository.saveQ({
                        agentURL : agentURL,
                        buildRequest : buildRequest
                    })
                ]);
            });
    }

    finish(buildResult : model.BuildResult) : Q.Promise<void> {
        return this.activeBuildsRepository.fetchFirstQ({'buildRequest.id' : buildResult.request.id})
            .then(activeBuild  => {
                return Q.all([
                    this.activeBuildsRepository.removeQ({'buildRequest.id' : buildResult.request.id}),
                    this.buildResultsRepository.saveQ(buildResult)
                ]);
            });
    }

    queuedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>> {
        let query = {userId : userId, status : model.BuildStatus.QUEUED};
        return this.queuedBuildsRepository.fetchQ(query, page, perPage,
                cursor => cursor.sort({'requestTimestamp' : 'ascending'}));
    }

    runningBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>> {
        let query = {userId : userId, status : model.BuildStatus.RUNNING};
        return this.queuedBuildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'processedTimestamp' : 'descending'}));
    }

    successfulBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>> {
        let query = {userId : userId, status : model.BuildStatus.SUCCESS};
        return this.queuedBuildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'finishedTimestamp' : 'descending'}));
    }

    failedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>> {
        let query = {userId : userId, status : model.BuildStatus.FAILED};
        return this.queuedBuildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'finishedTimestamp' : 'descending'}));
    }

    finishedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>> {
        let query = {userId : userId,
                     $or: [ { status: model.BuildStatus.SUCCESS },
                            { status: model.BuildStatus.FAILED }]};

        return this.queuedBuildsRepository.fetchQ(query, page, perPage,
            cursor => cursor.sort({'requestTimestamp' : 'descending'}));
    }

    activeBuilds(page : number, perPage : number) : Q.Promise<Array<model.ActiveBuild>> {
        return this.activeBuildsRepository.fetchQ({}, page, perPage,
                cursor => cursor.sort({'buildRequest.processedTimestamp' : 'descending'}));
    }

}
