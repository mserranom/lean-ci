"use strict";

import {startAsync, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {AppDriver} from '../support/AppDriver';

import {setupChai} from '../test_utils'

var expect = require('chai').expect;
setupChai();

describe('addition of a single repository and request of new builds:', () => {

    let appDriver : AppDriver;
    let testRepo = 'organisation/repo1';
    var app : App;

    beforeEach(async function(done) {
        let args = {
            mockDB : true,
            mockGit : true
        };
        app = await startAsync(args);
        appDriver = new AppDriver(app.getContainer());
        await createRepository();
        done();
    });

    afterEach( () => {
        app.stop();
        cleanup();
    });

    async function createRepository() : Promise<void> {
        await appDriver.createRepositories(testRepo);
    }

    it('requesting a build request should create a new pipeline and a new job',  async function(done) {

        const JOB_GENERATED_ID = '2';

        await createRepository();

        let pipeline : model.PipelineSchema = await appDriver.requestBuild(testRepo, 'commit-123');

        //// the pipeline contains a single build
        expect(pipeline.jobs).deep.equal([JOB_GENERATED_ID]);
        expect(pipeline.dependencies).deep.equal([]);
        //
        //// the build has been correctly created
        let build : model.BuildSchema = await appDriver.getBuild(parseInt(JOB_GENERATED_ID));
        expect(build._id).equals(parseInt(JOB_GENERATED_ID));
        expect(build.repo).equals(testRepo);
        expect(build.status).equals(model.BuildStatus.QUEUED);

        //// the pipelines can be requested
        let requestedPipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(requestedPipeline).deep.equal(pipeline);

        let activePipelines = await appDriver.getActivePipelines();
        expect(requestedPipeline).deep.equal(activePipelines[0]);

        done();
    });

    it('POST a second build request should create new pipelines and jobs',  async function(done) {

        const JOB_GENERATED_ID = '2';
        const SECOND_JOB_GENERATED_ID = '3';

        await createRepository();

        let pipeline : model.PipelineSchema = await appDriver.requestBuild(testRepo, 'commit-123');
        let pipeline2 : model.PipelineSchema = await appDriver.requestBuild(testRepo, 'commit-124');

        //check first pipeline

        expect(pipeline.jobs).deep.equal([JOB_GENERATED_ID]);
        expect(pipeline.dependencies).deep.equal([]);

        let build : model.BuildSchema = await appDriver.getBuild(parseInt(JOB_GENERATED_ID));
        expect(build._id).equals(parseInt(JOB_GENERATED_ID));
        expect(build.repo).equals(testRepo);
        expect(build.status).equals(model.BuildStatus.QUEUED);

        let requestedPipeline = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(requestedPipeline).deep.equal(pipeline);


        //check second pipeline

        expect(pipeline2.jobs).deep.equal(['3']);
        expect(pipeline2.dependencies).deep.equal([]);

        let build2 : model.BuildSchema = await appDriver.getBuild(parseInt(SECOND_JOB_GENERATED_ID));
        expect(build2._id).equals(parseInt(SECOND_JOB_GENERATED_ID));
        expect(build2.repo).equals(testRepo);
        expect(build2.status).equals(model.BuildStatus.QUEUED);

        requestedPipeline = await appDriver.getPipeline(parseInt(pipeline2._id));
        expect(requestedPipeline).deep.equal(pipeline2);

        // check active pipelines contains both pipelines, the latest first
        let activePipelines = await appDriver.getActivePipelines();
        expect(activePipelines).deep.equal([pipeline2, pipeline]);

        done();
    });

    it('when a build is finished, should be moved from active to finished pipelines',  async function(done) {

        await createRepository();

        let pipeline1 : model.PipelineSchema = await appDriver.requestBuild(testRepo, 'commit-123');
        let pipeline2 : model.PipelineSchema = await appDriver.requestBuild(testRepo, 'commit-124');

        let activePipelines = await appDriver.getActivePipelines();
        expect(activePipelines).deep.equal([pipeline2, pipeline1]);

        await appDriver.debugUpdatePipelineAsFinishedSuccesfully(pipeline2._id);

        activePipelines = await appDriver.getActivePipelines();
        expect(activePipelines).deep.equal([pipeline1]);

        let finishedPipelines = await appDriver.getFinishedPipelines();
        pipeline2.status = model.PipelineStatus.SUCCESS;
        expect(finishedPipelines).deep.equal([pipeline2]);

        done();
    });

    it('deleting a repo would keep an empty dependency graph',  async function(done) {

        await createRepository();

        await appDriver.deleteRepository(testRepo);

        let dependencyGraph =  await appDriver.getDependencyGraph();

        expect(dependencyGraph.dependencies).deep.equal([]);
        expect(dependencyGraph.repos).deep.equal([]);

        done();
    });

});



