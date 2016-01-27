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

        expect(pipeline.userId).equals(USER_ID);
        expect(pipeline.dependencies).deep.equal(DEPENDENCIES);
        expect(pipeline.jobs.length).equals(6);

        let upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        let downBuild1 = await appDriver.getBuild(parseInt(pipeline.jobs[1]));
        let downBuild2 = await appDriver.getBuild(parseInt(pipeline.jobs[2]));
        let downBuild3 = await appDriver.getBuild(parseInt(pipeline.jobs[3]));
        let downBuild4 = await appDriver.getBuild(parseInt(pipeline.jobs[4]));
        let downBuild5 = await appDriver.getBuild(parseInt(pipeline.jobs[5]));

        expect(upBuild.repo).equals('101');
        expect(upBuild.status).equals(model.BuildStatus.QUEUED);

        expect(downBuild1.repo).equals('102');
        expect(downBuild1.status).equals(model.BuildStatus.IDLE);
        expect(downBuild2.repo).equals('103');
        expect(downBuild2.status).equals(model.BuildStatus.IDLE);
        expect(downBuild3.repo).equals('104');
        expect(downBuild3.status).equals(model.BuildStatus.IDLE);
        expect(downBuild4.repo).equals('105');
        expect(downBuild4.status).equals(model.BuildStatus.IDLE);
        expect(downBuild5.repo).equals('106');
        expect(downBuild5.status).equals(model.BuildStatus.IDLE);

        done();
    });

    it('requesting a build for a build in the middle',  async function(done) {

        let pipeline = await appDriver.requestBuild('102', 'HEAD');

        expect(pipeline.userId).equals(USER_ID);
        expect(pipeline.dependencies).deep.equal([DEPENDENCIES[2], DEPENDENCIES[3], DEPENDENCIES[5], DEPENDENCIES[6]]);
        expect(pipeline.jobs.length).equals(4);

        let upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        let downBuild1 = await appDriver.getBuild(parseInt(pipeline.jobs[1]));
        let downBuild2 = await appDriver.getBuild(parseInt(pipeline.jobs[2]));
        let downBuild3 = await appDriver.getBuild(parseInt(pipeline.jobs[3]));

        expect(upBuild.repo).equals('102');
        expect(upBuild.status).equals(model.BuildStatus.QUEUED);

        expect(downBuild1.repo).equals('104');
        expect(downBuild1.status).equals(model.BuildStatus.IDLE);
        expect(downBuild2.repo).equals('105');
        expect(downBuild2.status).equals(model.BuildStatus.IDLE);
        expect(downBuild3.repo).equals('106');
        expect(downBuild3.status).equals(model.BuildStatus.IDLE);

        done();
    });

    it('a build in the middle, when the upstream build starts, the rest remain idle',  async function(done) {

        let pipeline = await appDriver.requestBuild('102', 'HEAD');

        expect(pipeline.userId).equals(USER_ID);
        expect(pipeline.dependencies).deep.equal([DEPENDENCIES[2], DEPENDENCIES[3], DEPENDENCIES[5], DEPENDENCIES[6]]);
        expect(pipeline.jobs.length).equals(4);

        let upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        await appDriver.updateBuildStatus(upBuild._id, model.BuildStatus.RUNNING);


        upBuild = await appDriver.getBuild(parseInt(pipeline.jobs[0]));
        let downBuild1 = await appDriver.getBuild(parseInt(pipeline.jobs[1]));
        let downBuild2 = await appDriver.getBuild(parseInt(pipeline.jobs[2]));
        let downBuild3 = await appDriver.getBuild(parseInt(pipeline.jobs[3]));

        expect(upBuild.repo).equals('102');
        expect(upBuild.status).equals(model.BuildStatus.RUNNING);

        expect(downBuild1.repo).equals('104');
        expect(downBuild1.status).equals(model.BuildStatus.IDLE);
        expect(downBuild2.repo).equals('105');
        expect(downBuild2.status).equals(model.BuildStatus.IDLE);
        expect(downBuild3.repo).equals('106');
        expect(downBuild3.status).equals(model.BuildStatus.IDLE);

        done();
    });

});



