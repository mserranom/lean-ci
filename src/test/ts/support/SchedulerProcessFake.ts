import {model} from '../../../main/ts/model';
import {repository} from '../../../main/ts/repository';
import {BuildQueue} from '../../../main/ts/build/BuildQueue'



export class SchedulerProcessFake {
    private repo : repository.DocumentRepositoryQ<model.BuildRequest>;
    private queue : BuildQueue;
    private userId : string;

    constructor(repo : repository.DocumentRepositoryQ<model.BuildRequest>, queue : BuildQueue, userId : string) {
        this.repo = repo;
        this.queue = queue;
        this.userId = userId;
    }

    async startNext() {
        let build : model.BuildRequest = await this.queue.nextQueuedBuild(this.userId);
        build.status = model.BuildStatus.RUNNING;
        await this.repo.updateQ({_id : build._id}, build)
    }

    async succeedOldestRunning() {
        let builds : Array<model.BuildRequest> = await this.queue.runningBuilds(this.userId, 1, 1);
        let build = builds[0];
        build.status = model.BuildStatus.SUCCESS;
        await this.repo.updateQ({_id : build._id}, build)
    }

    async failOldestRunning() {
        let builds : Array<model.BuildRequest> = await this.queue.runningBuilds(this.userId, 1, 1);
        let build = builds[0];
        build.status = model.BuildStatus.FAILED;
        await this.repo.updateQ({_id : build._id}, build)
    }

}
