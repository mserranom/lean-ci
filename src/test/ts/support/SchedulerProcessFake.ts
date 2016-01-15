"use strict";

import {model} from '../../../main/ts/model';
import {repository} from '../../../main/ts/repository';
import {BuildQueue} from '../../../main/ts/controllers/BuildController'

export class SchedulerProcessFake {
    private repo : repository.DocumentRepositoryQ<model.BuildSchema>;
    private queue : BuildQueue;
    private userId : string;

    constructor(repo : repository.DocumentRepositoryQ<model.BuildSchema>, queue : BuildQueue, userId : string) {
        this.repo = repo;
        this.queue = queue;
        this.userId = userId;
    }

    async startNext() {
        let build : model.BuildSchema = await this.queue.nextQueuedBuild(this.userId);
        build.status = model.BuildStatus.RUNNING;
        await this.repo.updateQ({_id : build._id}, build)
    }

    async markAsFinished(buildId : string) {
        let build : model.BuildSchema = await this.repo.fetchFirstQ({_id : buildId});
        build.commit = 'commit_id';
        build.config = {dependencies : [], commands : []};
        build.processedTimestamp = new Date();
        build.finishedTimestamp = new Date();
        build.log = 'build Log SUCCESS';
        await this.repo.updateQ({_id : build._id}, build);
    }

    async finishOldestRunningBuildWithSuccess() {
        let builds : Array<model.BuildSchema> = await this.queue.runningBuilds(this.userId,1 ,1);
        let build = builds[0];
        build.status = model.BuildStatus.SUCCESS;
        await this.repo.updateQ({_id : build._id}, build)
    }

    async finishOldestRunningBuildWithFail() {
        let builds : Array<model.BuildSchema> = await this.queue.runningBuilds(this.userId,1 ,1);
        let build = builds[0];
        build.status = model.BuildStatus.FAILED;
        await this.repo.updateQ({_id : build._id}, build)
    }

}
