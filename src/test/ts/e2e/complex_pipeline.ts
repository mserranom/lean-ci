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
            local : true,
            mockAgents : true,
            mockAuth : true
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

    async function checkBuildsStatus(buildIds : Array<string>, statuses : Array<Array<any>>) {
        expect(buildIds.length).equals(statuses.length);

        for(var i = 0; i < statuses.length; i++) {
            let jobId : string = buildIds[i];
            let build = await appDriver.getBuild(parseInt(jobId));
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
        let gitService : github.GitServiceMock = app.getComponent('githubApi');

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

        let expectedPipeline : model.PipelineSchema = {
                _id: pipeline._id,
                userId: USER_ID,
                status: model.PipelineStatus.RUNNING,
                jobs: [ '' + build._id ],
                dependencies: []
            };

        expect(pipeline).deep.equal(expectedPipeline);

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
        expect(activePipelines[0]).deep.equals(firstPipeline);
        expect(activePipelines[1]).deep.equals(secondPipeline);

        done();
    });


});



