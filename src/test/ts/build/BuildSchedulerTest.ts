import {TINGODB_PATH, createBuildRequest, createActiveBuild, stubPromise, stubRejectedPromise} from '../test_utils'

import {BuildSchedulerImpl} from '../../../../src/main/ts/build/BuildScheduler';
import {repository} from '../../../../src/main/ts/repository';
import {model} from '../../../../src/main/ts/model';

import {expect} from 'chai';

var simple = require('simple-mock');

var Q = require('Q');

describe('BuildScheduler', () => {

    let sut : BuildSchedulerImpl;

    let buildQueueMock : any;
    let buildServiceMock : any;

    beforeEach((done) => {
        repository.tingodbConnect(TINGODB_PATH, (err, db) => {
            if(err) {
                throw err;
            }
            sut = new BuildSchedulerImpl();
            sut.repositories = new repository.MongoDBRepository<model.Repository>('repositories', db);
            buildQueueMock = {};
            buildServiceMock = {};
            sut.buildQueue = buildQueueMock;
            sut.agentService = buildServiceMock;
            done();
        });
    });

    afterEach((done) => {
        sut.repositories.removeAllQ()
            .should.eventually.be.fulfilled
            .and.notify(done);
    });

    it('should orchestrate a build start with the queue and the agent service', (done) => {

        let activeBuild = createActiveBuild();

        sut.agentService.request = stubPromise(activeBuild);
        sut.buildQueue.nextScheduledBuild = stubPromise(activeBuild.buildRequest);
        sut.buildQueue.start = stubPromise();

        sut.repositories.saveQ({userId : activeBuild.buildRequest.user, name : activeBuild.buildRequest.repo})
            .then(() => { return sut.startBuild() })
            .should.eventually.equal(activeBuild.buildRequest)
            .and.notify(done);
    });

    it('should fail when attempting to start a build when no request is scheduled', (done) => {

        let activeBuild = createActiveBuild();

        sut.agentService.request = stubPromise(activeBuild);
        sut.buildQueue.nextScheduledBuild = stubRejectedPromise('test_reason no request scheduled');

        sut.repositories.saveQ({userId : activeBuild.buildRequest.user, name : activeBuild.buildRequest.repo})
            .then(() => { return sut.startBuild() })
            .should.eventually.be.rejectedWith('test_reason no request scheduled')
            .and.notify(done);
    });

});
