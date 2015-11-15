import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {github} from '../../../../src/main/ts/github';
import {doGet, doPost, doDel, USER_ID} from '../support/Requester';
import {expect} from 'chai';

import {setupChai} from '../test_utils'
import {SchedulerProcessFake} from "../support/SchedulerProcessFake";

setupChai();

describe('integration tests:', () => {

    let testRepo = 'organisation/repo';
    var app : App;

    function createScheduler() : SchedulerProcessFake {
        return new SchedulerProcessFake(app.getComponent('queuedBuildsRepository'),
            app.getComponent('buildQueue'), USER_ID);
    }

    async function addAndStartBuilds(totalBuilds : number, startedBuilds : number) {
        for(let i = 0; i < totalBuilds; i++) {
            await doPost('/repositories', {name : testRepo + i});
            await doPost('/builds', {repo : testRepo + i});
        }

        let scheduler = createScheduler();
        for(let i = 0; i < startedBuilds; i++) {
            await scheduler.startNext();
        }
    }

    beforeEach( (done) => {
        let args = {
            local : true,
            mockAgents : true,
            mockAuth : true
        };
        app = start(args);
        setTimeout(() => done(), 10);
    });

    afterEach( (done) => {
        app.stop();
        cleanup();
        setTimeout(() => done(), 10);
    });

    describe('/ping', () => {

        it('should return pong',  async function(done) {
            let res = await doGet('/ping');
            expect(res).equals('pong');
            done();
        });
    });

    describe('/builds', () => {

        it('POST build request',  async function(done) {
            let repoName = 'organisation/repo1';
            await doPost('/repositories', {name : repoName});

            let request : model.Build = await doPost('/builds', {repo : 'organisation/repo1'});

            expect(request).not.to.be.null;
            expect(request.repo).equals(repoName);
            expect(request.userId).equals(USER_ID);
            expect(request.requestTimestamp).not.to.be.null;
            expect(request.processedTimestamp).to.be.null
            done();
        });

        it('GET paged build requests',  async function(done) {

            let repoName = 'organisation/repo1';
            await doPost('/repositories', {name : repoName});

            for(var i = 0; i < 15; i++) {
                await doPost('/builds', {repo : repoName});
            }

            let result : Array<model.Build> = await doGet('/builds?page=1&per_page=14');

            expect(result.length).equals(14);

            let list : any = result; // cast to use chai-things
            list.should.all.have.property('repo', repoName);

            done();
        });
    });

    describe('/queued_builds', () => {

        it('GET paged queued builds, returning first the build that has been in the queue the longest',  async function(done) {

            for(var i = 0; i < 7; i++) {
                await doPost('/repositories', {name : testRepo + i});
                await doPost('/builds', {repo : testRepo + i});
            }

            let result : Array<model.Build> = await doGet('/queued_builds?page=1&per_page=3');

            expect(result.length).equals(3);
            expect(result[0].repo).equals(testRepo + '0');
            expect(result[1].repo).equals(testRepo + '1');
            expect(result[2].repo).equals(testRepo + '2');

            done();
        });
    });

    describe('/running_builds', () => {

        it('GET paged queued builds, returning first the build that started most recently',  async function(done) {

            await addAndStartBuilds(7, 4);

            let result : Array<model.Build> = await doGet('/running_builds?page=1&per_page=10');

            expect(result.length).equals(4);
            expect(result[0].repo).equals(testRepo + '0');
            expect(result[1].repo).equals(testRepo + '1');
            expect(result[2].repo).equals(testRepo + '2');
            expect(result[3].repo).equals(testRepo + '3');

            for(let i = 0; i < 4; i++) {
                expect(result[i].status).equals(model.BuildStatus.RUNNING);
            }

            done();
        });
    });

    describe('/finished_builds', () => {

        async function createSetOfFinishedBuilds() {
            await addAndStartBuilds(9, 6);

            let scheduler = createScheduler();
            await scheduler.finishOldestRunningBuildWithFail();
            await scheduler.finishOldestRunningBuildWithSuccess();
            await scheduler.finishOldestRunningBuildWithFail();
            await scheduler.finishOldestRunningBuildWithSuccess();
        }

        it('GET paged queued builds, returning first the build that finished most recently',  async function(done) {

            await createSetOfFinishedBuilds();

            let result : Array<model.Build> = await doGet('/finished_builds?page=1&per_page=10');

            expect(result.length).equals(4);
            expect(result[0].repo).equals(testRepo + '3');
            expect(result[0].status).equals(model.BuildStatus.SUCCESS);

            expect(result[1].repo).equals(testRepo + '2');
            expect(result[1].status).equals(model.BuildStatus.FAILED);

            expect(result[2].repo).equals(testRepo + '1');
            expect(result[2].status).equals(model.BuildStatus.SUCCESS);

            expect(result[3].repo).equals(testRepo + '0');
            expect(result[3].status).equals(model.BuildStatus.FAILED);

            done();
        });

        it('GET paged queued builds, querying successful builds',  async function(done) {

            await createSetOfFinishedBuilds();

            let result : Array<model.Build> = await doGet('/finished_builds?page=1&per_page=10&status=success');

            expect(result.length).equals(2);
            expect(result[0].repo).equals(testRepo + '1');
            expect(result[0].status).equals(model.BuildStatus.SUCCESS);

            expect(result[1].repo).equals(testRepo + '3');
            expect(result[1].status).equals(model.BuildStatus.SUCCESS);

            done();
        });

        it('GET single build',  async function(done) {

            await createSetOfFinishedBuilds();

            let result : model.Build = await doGet('/builds/8');

            expect(result.repo).equals(testRepo + '6');
            expect(result.status).equals(model.BuildStatus.QUEUED);

            done();
        });

        it('GET paged queued builds, querying failed builds',  async function(done) {

            await createSetOfFinishedBuilds();

            let result : Array<model.Build> = await doGet('/finished_builds?page=1&per_page=10&status=failed');

            expect(result.length).equals(2);
            expect(result[0].repo).equals(testRepo + '0');
            expect(result[0].status).equals(model.BuildStatus.FAILED);

            expect(result[1].repo).equals(testRepo + '2');
            expect(result[1].status).equals(model.BuildStatus.FAILED);

            done();
        });
    });

    describe('/repositories', () => {

        it('GET paged repositories',  async function(done) {
            for(var i = 0; i < 15; i++) {
                await doPost('/repositories', {name : 'organisation/repo' + i});
            }

            let repositories : Array<model.Repository> = await doGet('/repositories?page=1&per_page=12');

            let pageSize = 12;
            expect(repositories.length).equals(pageSize);
            done();
        });

        it('DELETE single repository',  async function(done) {
            await doPost('/repositories', {name : 'organisation/repo1'});

            let repositories : Array<model.Repository> = await doGet('/repositories');
            expect(repositories.length).equals(1);

            let id = repositories[0]['_id'];

            await doDel('/repositories/' + id);

            repositories = await doGet('/repositories');

            expect(repositories.length).equals(0);
            done();
        });

    });

});



