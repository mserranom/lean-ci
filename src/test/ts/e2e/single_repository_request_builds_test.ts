"use strict";

import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {doGet, doPost, doDel, USER_ID} from '../support/Requester';
import {AppDriver} from '../support/AppDriver';

import {setupChai, sleep} from '../test_utils'

var expect = require('chai').expect;
setupChai();

describe('addition of a single repository and request of new builds', () => {

    let appDriver = new AppDriver();
    let testRepo = 'organisation/repo1';
    var app : App;

    beforeEach(async function(done) {
        let args = {
            local : true,
            mockAgents : true,
            mockAuth : true
        };
        app = start(args);
        await sleep(10);
        await createRepository();
        done();
    });

    afterEach( (done) => {
        app.stop();
        cleanup();
        setTimeout(() => done(), 10);
    });

    async function createRepository() : Promise<void> {
        await appDriver.createRepositories(testRepo);
    }

    it('POST a new build request should create a new pipeline and a new job',  async function(done) {

        const JOB_GENERATED_ID = '2';

        await createRepository();

        let pipeline : model.PipelineSchema = await appDriver.requestBuild(testRepo, 'commit-123');

        expect(pipeline.jobs).deep.equal([JOB_GENERATED_ID]);
        expect(pipeline.dependencies).deep.equal([]);

        let build : model.BuildSchema = await appDriver.getBuild(parseInt(JOB_GENERATED_ID));
        expect(build._id).equals(parseInt(JOB_GENERATED_ID));
        expect(build.repo).equals(testRepo);
        expect(build.status).equals(model.BuildStatus.QUEUED);

        let requestedPipeline:model.PipelineSchema = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(requestedPipeline).deep.equal(pipeline);

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

        let build : model.BuildSchema = await doGet('/builds/' + JOB_GENERATED_ID);
        expect(build._id).equals(parseInt(JOB_GENERATED_ID));
        expect(build.repo).equals(testRepo);
        expect(build.status).equals(model.BuildStatus.QUEUED);

        let requestedPipeline:model.PipelineSchema = await appDriver.getPipeline(parseInt(pipeline._id));
        expect(requestedPipeline).deep.equal(pipeline);


        //check second pipeline

        expect(pipeline2.jobs).deep.equal(['3']);
        expect(pipeline2.dependencies).deep.equal([]);

        let build2 : model.BuildSchema = await doGet('/builds/' + SECOND_JOB_GENERATED_ID);
        expect(build2._id).equals(parseInt(SECOND_JOB_GENERATED_ID));
        expect(build2.repo).equals(testRepo);
        expect(build2.status).equals(model.BuildStatus.QUEUED);

        requestedPipeline = await appDriver.getPipeline(parseInt(pipeline2._id));
        expect(requestedPipeline).deep.equal(pipeline2);


        done();
    });

});



