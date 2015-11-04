///<reference path="../../../../lib/Q.d.ts"/>

import {model} from '../model';
import {config} from '../config';
import {BuildQueue} from './BuildQueue';
import {repository} from '../repository';

import {Inject} from '../../../../lib/container'

var Q = require('q');

export interface BuildScheduler {
    queueBuild(userId : string, repo : string) : Q.Promise<model.BuildRequest>
    queueBuild(userId : string, repo : string, commit:string) : Q.Promise<model.BuildRequest>
    startBuild(userId : string) : Q.Promise<model.BuildRequest>;
    pingFinish(result : model.BuildResult) : Q.Promise<void>;
}

//TODO: Temporal Mock
export interface BuildAgentService {
    request(nextRequest : model.BuildRequest)  : Q.Promise<model.ActiveBuild>;
    getStatus(scheduledBuild : model.ActiveBuild) : Q.Promise<string>;
    terminateAgent(buildId : string);
}

export class BuildSchedulerImpl implements BuildScheduler{

    @Inject('buildQueue')
    buildQueue : BuildQueue;

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepositoryQ<model.Repository>;

    agentService : BuildAgentService;

    queueBuild(userId : string, repo : string, commit?:string) : Q.Promise<model.BuildRequest> {
        commit = commit || '';

        console.log('adding ' + repo  + (commit ? ('@' + commit) : 'HEAD') + ' to the build queue');

        let pingURL = config.appUrl + '/build/pingFinish';
        let request = this.createBuildRequest(userId, repo, commit, pingURL);

        return this.repositories.fetchFirstQ({name : repo})
            .then(() => { return this.buildQueue.add(request) })
            .then(() => { return request });
    }

    startBuild(userId : string) : Q.Promise<model.BuildRequest> {
        let carryOnRequest : model.BuildRequest;

        console.log('starting next scheduled build');

        return this.buildQueue.nextQueuedBuild(userId)
            .then((request : model.BuildRequest) => {
                carryOnRequest = request;
                return this.agentService.request(request)
            })
            .then((host : any) => { return this.buildQueue.start(carryOnRequest.id, host) })
            .then(() => { return carryOnRequest });
    }

    pingFinish(result:model.BuildResult) : Q.Promise<void> {
        return this.buildQueue.finish(result);
    }

    private createBuildRequest(userId : string, repo : string, commit : string, pingURL : string) : model.BuildRequest {
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
}
