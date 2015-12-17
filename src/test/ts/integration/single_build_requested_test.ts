"use strict";

import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {doGet, doPost, doDel, USER_ID} from '../support/Requester';
import {expect} from 'chai';

import {setupChai, sleep} from '../test_utils'

setupChai();

describe('addition of a new repository', () => {

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
        await doPost('/repositories', {name : testRepo});
    }

    it('POST a new build request should create a new pipeline and a new job',  async function(done) {

        const JOB_GENERATED_ID = '2';

        await createRepository();

        let pipeline : model.PipelineSchema = await doPost('/build_requests', {repo : testRepo, commit : 'commit-123'});

        expect(pipeline.jobs).deep.equal([JOB_GENERATED_ID]);
        expect(pipeline.dependencies).deep.equal([]);
        expect(pipeline.status).equals(model.PipelineStatus.RUNNING);

        let build : model.Build = await doGet('/builds/' + JOB_GENERATED_ID);
        expect(build._id).equals(parseInt(JOB_GENERATED_ID));
        expect(build.repo).equals(testRepo);
        expect(build.status).equals(model.BuildStatus.QUEUED);

        done();
    });

});



