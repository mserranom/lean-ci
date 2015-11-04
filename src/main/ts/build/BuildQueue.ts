///<reference path="../../../../lib/Q.d.ts"/>

import {model} from '../model';
import {repository} from '../repository';

import {Inject} from '../../../../lib/container'

var Q = require('q');

export interface BuildQueue {
    add(repo : model.BuildRequest) : Q.Promise<void>;
    nextQueuedBuild(userId : string) : Q.Promise<model.BuildRequest>;
    start(buildRequestId : string, agentURL : string) : Q.Promise<void>;
    finish(buildResult : model.BuildResult) : Q.Promise<void>;
    queuedBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>>;
    runningBuilds(userId : string, page : number, perPage : number) : Q.Promise<Array<model.BuildRequest>>;
    activeBuilds(page : number, perPage : number) : Q.Promise<Array<model.ActiveBuild>>;
    finishedBuilds(page : number, perPage : number) : Q.Promise<Array<model.BuildResult>>;
}

export class PersistedBuildQueue implements BuildQueue {

    @Inject('queuedBuildsRepository')
    queuedBuildsRepository : repository.DocumentRepositoryQ<model.BuildRequest>;

    @Inject('activeBuildsRepository')
    activeBuildsRepository : repository.DocumentRepositoryQ<model.ActiveBuild>;

    @Inject('buildResultsRepository')
    buildResultsRepository : repository.DocumentRepositoryQ<model.BuildResult>;

    add(repo : model.BuildRequest) : Q.Promise<void>  {
        return this.queuedBuildsRepository.saveQ(repo);
    }

    nextQueuedBuild(userId : string) : Q.Promise<model.BuildRequest> {
        return this.queuedBuilds(userId, 1, 1).then((items) => { return items[0]});
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
            cursor => cursor.sort({'requestTimestamp' : 'descending'}));
    }

    activeBuilds(page : number, perPage : number) : Q.Promise<Array<model.ActiveBuild>> {
        return this.activeBuildsRepository.fetchQ({}, page, perPage,
                cursor => cursor.sort({'buildRequest.processedTimestamp' : 'descending'}));
    }

    finishedBuilds(page : number, perPage : number) : Q.Promise<Array<model.BuildResult>> {
        return this.buildResultsRepository.fetchQ({}, page, perPage,
                cursor => cursor.sort({'finishedTimestamp' : 'descending'}));
    }

}
