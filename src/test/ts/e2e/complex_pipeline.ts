"use strict";

import {startAsync, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {USER_ID} from '../support/Requester';
import {AppDriver} from '../support/AppDriver';
import {github} from '../../../../src/main/ts/github';

import {setupChai} from '../test_utils'

var expect = require('chai').expect;
setupChai();

describe('complex pipeline:', () => {

    let appDriver : AppDriver;
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

    const DEPENDENCIES = [  { up: '101', down: '102' },
        { up: '101', down: '103' },
        { up: '102', down: '104' },
        { up: '102', down: '105' },
        { up: '103', down: '105' },
        { up: '104', down: '106' },
        { up: '105', down: '106' } ];

    // aliases
    const Q = model.BuildStatus.QUEUED;
    const I = model.BuildStatus.IDLE;
    const R = model.BuildStatus.RUNNING;
    const S = model.BuildStatus.SUCCESS;
    const F = model.BuildStatus.FAILED;
    const SK = model.BuildStatus.SKIPPED;

    async function checkBuildsStatus(buildIds : Array<string>, statuses : Array<Array<any>>) {
        expect(buildIds.length).equals(statuses.length);

        let builds = [];

        for(var i = 0; i < statuses.length; i++) {
            let jobId : string = buildIds[i];
            let build = await appDriver.getBuild(parseInt(jobId));
            builds.push(build);
        }

        for(var i = 0; i < builds.length; i++) {
            let build = builds[i];
            let expectedRepo = statuses[i][0];
            let expectedStatus = statuses[i][1];
            expect(build.repo).equals(expectedRepo);
            expect(build.status).equals(expectedStatus);
        }

    }

    //                   -> |104| -
    //                 /            \
    //       -> |102|-                -> |106|
    //     /           \            /
    //  \101\            -> |105| -
    //     \           /
    //       -> |103|-
    //
    async function createRepositories() : Promise<void> {
        let gitService : github.GitServiceMock = app.getComponent('gitServiceFactory').getService();

        await appDriver.createRepositories('101');

        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : ['101']}));
        await appDriver.createRepositories('102', '103');

        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : ['102']}));
        await appDriver.createRepositories('104');

        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : ['102', '103']}));
        await appDriver.createRepositories('105');

        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : ['104', '105']}));
        await appDriver.createRepositories('106');
    }

    it('the dependency graph is correct',  async function(done) {

        let dependencyGraph = await appDriver.getDependencyGraph();

        let expectedGraph  = {
            _id: dependencyGraph._id,
            userId: USER_ID,
            repos: [ '101', '102', '103', '104', '105', '106' ],
            dependencies: DEPENDENCIES};

        expect(dependencyGraph).deep.equal(expectedGraph);

        done();
    });

    it('requesting a build for the downstream dependency produces a 1 build pipeline',  async function(done) {

        let pipeline = await appDriver.requestBuild('106', 'HEAD');
        let build = await appDriver.getBuild(parseInt(pipeline.jobs[0]));

        expect(build.repo).equals('106');
        expect(build.commit).equals('HEAD');
        expect(build.status).equals(model.BuildStatus.QUEUED);
        expect(build.userId).equals(USER_ID);

        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);
        expect(pipeline.jobs).deep.equals([ '' + build._id ]);
        expect(pipeline.dependencies).deep.equals([]);

        done();
    });

    it('requesting a build for the upstream dependency produces a 6 build pipeline, the first queued, rest are idle',  async function(done) {

        let pipeline = await appDriver.requestBuild('101', 'HEAD');

        expect(pipeline.dependencies).deep.equal(DEPENDENCIES);
        expect(pipeline.jobs.length).equals(6);

        await checkBuildsStatus(pipeline.jobs,[['101', Q], ['102', I], ['103', I], ['104', I], ['105', I], ['106', I]]);

        done();
    });

    it('requesting a build for a build in the middle',  async function(done) {

        let pipeline = await appDriver.requestBuild('102', 'HEAD');

        expect(pipeline.dependencies).deep.equal([DEPENDENCIES[2], DEPENDENCIES[3], DEPENDENCIES[5], DEPENDENCIES[6]]);
        expect(pipeline.jobs.length).equals(4);

        await checkBuildsStatus(pipeline.jobs,[['102', Q], ['104', I], ['105', I], ['106', I]]);

        done();
    });

    it('a build in the middle, when the upstream build starts, the rest remain idle',  async function(done) {

        let pipeline = await appDriver.requestBuild('102', 'HEAD');

        expect(pipeline.dependencies).deep.equal([DEPENDENCIES[2], DEPENDENCIES[3], DEPENDENCIES[5], DEPENDENCIES[6]]);
        expect(pipeline.jobs.length).equals(4);

        let upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);

        await checkBuildsStatus(pipeline.jobs,[['102', R], ['104', I], ['105', I], ['106', I]]);

        done();
    });

    it('requesting a second build',  async function(done) {

        // first pipeline is requested and starts running
        let firstPipeline = await appDriver.requestBuild('102', 'HEAD');

        expect(firstPipeline.dependencies).deep.equal([DEPENDENCIES[2], DEPENDENCIES[3], DEPENDENCIES[5], DEPENDENCIES[6]]);
        expect(firstPipeline.jobs.length).equals(4);

        let upBuild = await appDriver.getBuild(parseInt(firstPipeline.jobs[0]));
        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);

        await checkBuildsStatus(firstPipeline.jobs,[['102', R], ['104', I], ['105', I], ['106', I]]);

        // requesting a second pipeline
        let secondPipeline = await appDriver.requestBuild('101', 'HEAD');

        expect(secondPipeline).not.equals(firstPipeline);
        expect(secondPipeline.dependencies).deep.equal(DEPENDENCIES);
        expect(secondPipeline.jobs.length).equals(6);

        await checkBuildsStatus(secondPipeline.jobs,[['101', Q], ['102', I], ['103', I], ['104', I], ['105', I], ['106', I]]);

        // check active pipelines return correctly
        let activePipelines = await appDriver.getActivePipelines();
        expect(activePipelines[0]).deep.equals(secondPipeline);
        expect(activePipelines[1]).deep.equals(firstPipeline);

        done();
    });

    it('successful completion of the pipeline',  async function(done) {

        let pipeline = await appDriver.requestBuild('101', 'HEAD');

        let backgroundPipeline1 = await appDriver.requestBuild('102', 'HEAD');
        let backgroundPipeline2 = await appDriver.requestBuild('105', 'HEAD');

        await checkBuildsStatus(pipeline.jobs,[['101', Q], ['102', I], ['103', I], ['104', I], ['105', I], ['106', I]]);

        await appDriver.startAndSucceedBuild(pipeline.jobs[0]);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', Q], ['103', Q], ['104', I], ['105', I], ['106', I]]);

        await appDriver.startAndSucceedBuild(pipeline.jobs[1]);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', Q], ['104', Q], ['105', I], ['106', I]]);

        await appDriver.updateBuildStatus(pipeline.jobs[2], model.BuildStatus.RUNNING);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', R], ['104', Q], ['105', I], ['106', I]]);

        await appDriver.updateBuildStatus(pipeline.jobs[2], model.BuildStatus.SUCCESS);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', S], ['104', Q], ['105', Q], ['106', I]]);

        pipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);

        await appDriver.startAndSucceedBuild(pipeline.jobs[3]);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', S], ['104', S], ['105', Q], ['106', I]]);

        await appDriver.updateBuildStatus(pipeline.jobs[4], model.BuildStatus.RUNNING);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', S], ['104', S], ['105', R], ['106', I]]);


        //background activity in the middle
        await appDriver.startAndSucceedBuild(backgroundPipeline2.jobs[0]);

        await appDriver.updateBuildStatus(pipeline.jobs[4], model.BuildStatus.SUCCESS);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', S], ['104', S], ['105', S], ['106', Q]]);

        pipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);

        await appDriver.updateBuildStatus(pipeline.jobs[5], model.BuildStatus.RUNNING);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', S], ['104', S], ['105', S], ['106', R]]);

        pipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);

        await appDriver.updateBuildStatus(pipeline.jobs[5], model.BuildStatus.SUCCESS);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', S], ['104', S], ['105', S], ['106', S]]);

        pipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(pipeline.status).equals(model.PipelineStatus.SUCCESS);


        //now checking the status of the other pipelines, shouldn't have changed

        backgroundPipeline1 = await appDriver.getPipeline(parseInt(backgroundPipeline1._id));
        expect(backgroundPipeline1.status).equals(model.PipelineStatus.RUNNING);
        await checkBuildsStatus(backgroundPipeline1.jobs,[['102', Q], ['104', I], ['105', I], ['106', I]]);

        backgroundPipeline2 = await appDriver.getPipeline(parseInt(backgroundPipeline2._id));
        expect(backgroundPipeline2.status).equals(model.PipelineStatus.RUNNING);
        await checkBuildsStatus(backgroundPipeline2.jobs,[['105', S], ['106', Q]]);

        done();
    });

    it('failing build, while continuing remaining builds that are not blocked by failing ones',  async function(done) {

        let pipeline = await appDriver.requestBuild('101', 'HEAD');

        let backgroundPipeline1 = await appDriver.requestBuild('102', 'HEAD');
        let backgroundPipeline2 = await appDriver.requestBuild('105', 'HEAD');

        await checkBuildsStatus(pipeline.jobs,[['101', Q], ['102', I], ['103', I], ['104', I], ['105', I], ['106', I]]);

        await appDriver.startAndSucceedBuild(pipeline.jobs[0]);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', Q], ['103', Q], ['104', I], ['105', I], ['106', I]]);

        await appDriver.startAndSucceedBuild(pipeline.jobs[1]);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', Q], ['104', Q], ['105', I], ['106', I]]);

        pipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);

        await appDriver.updateBuildStatus(pipeline.jobs[2], model.BuildStatus.RUNNING);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', R], ['104', Q], ['105', I], ['106', I]]);

        await appDriver.updateBuildStatus(pipeline.jobs[2], model.BuildStatus.FAILED);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', F], ['104', Q], ['105', I], ['106', I]]);

        //background activity in the middle
        await appDriver.startAndSucceedBuild(backgroundPipeline2.jobs[0]);

        pipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);

        await appDriver.startAndSucceedBuild(pipeline.jobs[3]);
        await checkBuildsStatus(pipeline.jobs,[['101', S], ['102', S], ['103', F], ['104', S], ['105', SK], ['106', SK]]);

        pipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(pipeline.status).equals(model.PipelineStatus.FAILED);



        //now checking the status of the other pipelines, shouldn't have changed

        backgroundPipeline1 = await appDriver.getPipeline(parseInt(backgroundPipeline1._id));
        expect(backgroundPipeline1.status).equals(model.PipelineStatus.RUNNING);
        await checkBuildsStatus(backgroundPipeline1.jobs,[['102', Q], ['104', I], ['105', I], ['106', I]]);

        backgroundPipeline2 = await appDriver.getPipeline(parseInt(backgroundPipeline2._id));
        expect(backgroundPipeline2.status).equals(model.PipelineStatus.RUNNING);
        await checkBuildsStatus(backgroundPipeline2.jobs,[['105', S], ['106', Q]]);

        done();
    });

    it('deletion of a repository',  async function(done) {

        await appDriver.deleteRepository('105');

        let dependencyGraph =  await appDriver.getDependencyGraph();

        let expectedDependencies = [  { up: '101', down: '102' },
            { up: '101', down: '103' },
            { up: '102', down: '104' },
            { up: '104', down: '106' } ];

        let expectedGraph  = {
            _id: dependencyGraph._id,
            userId: USER_ID,
            repos: [ '101', '102', '103', '104', '106' ],
            dependencies: expectedDependencies};

        expect(dependencyGraph).deep.equal(expectedGraph);

        done();
    });


});



