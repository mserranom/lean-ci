///<reference path="../../../../lib/Q.d.ts"/>

import {model} from '../model';
import {config} from '../config';
import {BuildQueue} from './BuildQueue';
import {repository} from '../repository';

import {Inject} from '../../../../lib/container'

var Q = require('q');

export interface BuildScheduler {
    queueBuild(repo : string) : Q.Promise<model.BuildRequest>
    queueBuild(repo : string, commit:string) : Q.Promise<model.BuildRequest>
    startBuild() : Q.Promise<model.BuildRequest>;
    pingFinish(result : model.BuildResult) : Q.Promise<void>;
}

//TODO: Temporal
export interface BuildAgentService {
    request(nextRequest : model.BuildRequest)  : Q.Promise<model.ActiveBuild>;
    getStatus(scheduledBuild : model.ActiveBuild) : Q.Promise<string>;
    terminateAgent(buildId : string);
}

export class BuildSchedulerImpl implements BuildScheduler{

    @Inject('buildQueue2')
    buildQueue : BuildQueue;

    @Inject('repositoriesRepository')
    repositories : repository.DocumentRepositoryQ<model.Repository>;

    agentService : BuildAgentService;

    queueBuild(repo : string, commit?:string) : Q.Promise<model.BuildRequest> {
        commit = commit || '';

        console.log('adding ' + repo  + (commit ? ('@' + commit) : 'HEAD') + ' to the build queue');

        let pingURL = config.appUrl + '/build/pingFinish';
        let request = this.createBuildRequest(repo, commit, pingURL);

        return this.repositories.fetchFirstQ({name : repo})
            .then(() => { return this.buildQueue.add(request) })
            .then(() => { return request });
    }

    startBuild() : Q.Promise<model.BuildRequest> {
        let carryOnRequest : model.BuildRequest;

        console.log('starting next scheduled build');

        return this.buildQueue.nextScheduledBuild()
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

    private createBuildRequest(repo : string, commit : string, pingURL : string) : model.BuildRequest {
        return {
            id : new Date().getTime() + "-" + Math.floor(Math.random() * 10000000000),
            user : 'user',
            repo : repo,
            commit : commit,
            pingURL : pingURL,
            requestTimestamp : new Date(),
            processedTimestamp : null
        };
    }
}