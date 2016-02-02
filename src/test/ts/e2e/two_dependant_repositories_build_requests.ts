"use strict";

import {startAsync, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {USER_ID} from '../support/Requester';
import {AppDriver} from '../support/AppDriver';
import {github} from '../../../../src/main/ts/github';

import {setupChai} from '../test_utils'

var expect = require('chai').expect;
setupChai();

describe('requesting new builds with 2 dependant repositories:', () => {

    let appDriver : AppDriver;
    let upRepo = 'organisation/upRepo';
    let downRepo = 'organisation/downRepo';
    var app : App;

    beforeEach(async function(done) {
        let args = {
            mockDB : true,
            mockGit : true
        };
        app = await startAsync(args);
        appDriver = new AppDriver(app.getContainer());
        await createRepositories();
        done();
    });

    afterEach( () => {
        app.stop();
        cleanup();
    });

    async function createRepositories() : Promise<void> {
        await appDriver.createRepositories(upRepo);

        let gitService : github.GitServiceMock = app.getComponent('gitServiceFactory').getService();
        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : [upRepo]}));

        await appDriver.createRepositories(downRepo);
    }

    async function checkStatus(pipeline : model.PipelineSchema, pipelineStatus : model.PipelineStatus,
                               upStatus : model.BuildStatus, downStatus : model.BuildStatus) {

        expect(pipeline.status).equals(pipelineStatus);

        let upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        expect(upBuild.status).equals(upStatus);

        let downBuild = await appDriver.getBuild(parseInt(pipeline.jobs[1]));
        expect(downBuild.status).equals(downStatus);

    }

    it('the dependency graph is correct',  async function(done) {

        let dependencyGraph = await appDriver.getDependencyGraph();

        let expectedGraph : model.DependencyGraphSchema = {
                    _id: dependencyGraph._id,
                    userId: USER_ID,
                    repos: [ upRepo, downRepo ],
                    dependencies: [ { up: upRepo, down: downRepo } ]
                };

        expect(dependencyGraph).deep.equal(expectedGraph);

        done();
    });

    it('requesting a build for the downstream dependency produces a 1 build pipeline',  async function(done) {

        let pipeline = await appDriver.requestBuild(downRepo, 'HEAD');
        let build = await appDriver.getBuild(parseInt(pipeline.jobs[0]));

        expect(build.repo).equals(downRepo);
        expect(build.commit).equals('HEAD');
        expect(build.status).equals(model.BuildStatus.QUEUED);
        expect(build.userId).equals(USER_ID);

        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);
        expect(pipeline.jobs).deep.equals([ '' + build._id ]);
        expect(pipeline.dependencies).deep.equals([]);

        done();
    });

    it('requesting a build for the upstream dependency produces a 2 build pipeline, the first queued, the second is idle',  async function(done) {

        let pipeline = await appDriver.requestBuild(upRepo, 'HEAD');

        expect(pipeline.userId).equals(USER_ID);
        expect(pipeline.dependencies).deep.equal([{ up: upRepo, down: downRepo }]);
        expect(pipeline.jobs.length).equals(2);

        let upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        let downBuild = await appDriver.getBuild(parseInt(pipeline.jobs[1]));

        expect(upBuild.repo).equals(upRepo);
        expect(upBuild.status).equals(model.BuildStatus.QUEUED);

        expect(downBuild.repo).equals(downRepo);
        expect(downBuild.status).equals(model.BuildStatus.IDLE);

        done();
    });

    it('when the upstream build starts, the second remains idle',  async function(done) {

        const pipeline = await appDriver.requestBuild(upRepo, 'HEAD');

        const upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));

        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);

        const updatedPipeline = await appDriver.getPipeline(parseInt(pipeline._id));

        checkStatus(updatedPipeline,
            model.PipelineStatus.RUNNING, model.BuildStatus.SUCCESS, model.BuildStatus.IDLE);

        done();
    });

    it('when the upstream build is finished, the second is queued',  async function(done) {

        const pipeline = await appDriver.requestBuild(upRepo, 'HEAD');

        const upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));

        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);
        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.SUCCESS);

        const updatedPipeline = await appDriver.getPipeline(parseInt(pipeline._id));

        checkStatus(updatedPipeline,
            model.PipelineStatus.RUNNING, model.BuildStatus.SUCCESS, model.BuildStatus.QUEUED);

        done();
    });

    it('when the downstream build is finished, the pipeline finishes successfully',  async function(done) {
        const pipeline = await appDriver.requestBuild(upRepo, 'HEAD');

        const upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        const downBuild = await appDriver.getBuild(parseInt(pipeline.jobs[1]));

        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);
        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.SUCCESS);
        await appDriver.updateBuildStatus(downBuild._id, model.BuildStatus.RUNNING);
        await appDriver.updateBuildStatus(downBuild._id, model.BuildStatus.SUCCESS);

        const updatedPipeline = await appDriver.getPipeline(parseInt(pipeline._id));

        checkStatus(updatedPipeline,
            model.PipelineStatus.SUCCESS, model.BuildStatus.SUCCESS, model.BuildStatus.SUCCESS);

        done();
    });

    it('when the first build fails, the pipeline fails and the second is skipped',  async function(done) {
        const pipeline = await appDriver.requestBuild(upRepo, 'HEAD');

        const upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));

        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);
        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.FAILED);

        const updatedPipeline = await appDriver.getPipeline(parseInt(pipeline._id));

        checkStatus(updatedPipeline,
            model.PipelineStatus.FAILED, model.BuildStatus.FAILED, model.BuildStatus.SKIPPED);

        done();
    });

    it('when the 2nd build fails, the pipeline fails',  async function(done) {
        const pipeline = await appDriver.requestBuild(upRepo, 'HEAD');

        const upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        const downBuild = await appDriver.getBuild(parseInt(pipeline.jobs[1]));

        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);
        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.SUCCESS);
        await appDriver.updateBuildStatus(downBuild._id, model.BuildStatus.RUNNING);
        await appDriver.updateBuildStatus(downBuild._id, model.BuildStatus.FAILED);

        const updatedPipeline = await appDriver.getPipeline(parseInt(pipeline._id));

        checkStatus(updatedPipeline,
            model.PipelineStatus.FAILED, model.BuildStatus.SUCCESS, model.BuildStatus.FAILED);

        done();
    });

    it('deleting the upstream repo would keep a single repo dependency graph',  async function(done) {

        await appDriver.deleteRepository(upRepo);

        let dependencyGraph =  await appDriver.getDependencyGraph();

        expect(dependencyGraph.dependencies).deep.equal([]);
        expect(dependencyGraph.repos).deep.equal([downRepo]);

        done();
    });

});



