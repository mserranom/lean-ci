import {createBuildRequest, createBuildResult, TINGODB_PATH} from '../test_utils'

import {PersistedBuildQueue} from '../../../../src/main/ts/build/BuildQueue';
import {repository} from '../../../../src/main/ts/repository';
import {model} from '../../../../src/main/ts/model';

import {expect} from 'chai';

var Q = require('q');

describe('PersistedBuildQueue', () => {

    let testUser : string = createBuildRequest().userId;

    let sut : PersistedBuildQueue;

    beforeEach((done) => {
        repository.tingodbConnect(TINGODB_PATH, (err, db) => {
            if(err) {
                throw err;
            }
            sut = new PersistedBuildQueue();
            sut.activeBuildsRepository = new repository.MongoDBRepository<model.ActiveBuild>('active_builds', db);
            sut.buildResultsRepository = new repository.MongoDBRepository<model.BuildResult>('build_results', db);
            sut.queuedBuildsRepository = new repository.MongoDBRepository<model.BuildRequest>('queued_builds', db);
            done();
        });

    });

    afterEach((done) => {
        Q.all([sut.activeBuildsRepository.removeAllQ(), sut.buildResultsRepository.removeAllQ(), sut.queuedBuildsRepository.removeAllQ()])
            .should.eventually.be.fulfilled
            .and.notify(done);
    });

    it('build requests should be added to queue', (done) => {
        let req = createBuildRequest();
        req.id = 'test_id';

        sut.add(req)
            .then(() => { return sut.queuedBuilds(testUser, 1, 10) })
            .should.eventually.have.lengthOf(1)
            .and.satisfy(items => {return items[0].id === req.id})
            .and.notify(done);
    });

    it('build queue should have oldest requests first on the queue', (done) => {
        let oldReq = createBuildRequest();
        oldReq.id = 'test_id_old';
        oldReq.requestTimestamp.setTime(oldReq.requestTimestamp.getTime() - 100000);

        let newReq = createBuildRequest();
        newReq.id = 'test_id_new';

        sut.add(newReq)
            .then(() => { return sut.add(oldReq) })
            .then(() => { return sut.queuedBuilds(testUser, 1, 10) })
            .should.eventually.have.lengthOf(2)
            .and.satisfy(items => { return items[0].id === oldReq.id && items[1].id === newReq.id})
            .and.notify(done);
    });

    it('active builds should have most recently started builds first on the list', (done) => {
        let oldReq = createBuildRequest();
        oldReq.id = 'test_id_old';
        oldReq.processedTimestamp.setTime(oldReq.requestTimestamp.getTime() - 100000);

        let newReq = createBuildRequest();
        newReq.id = 'test_id_new';

        sut.add(newReq)
            .then(() => { return sut.add(oldReq) })
            .then(() => { return sut.start(oldReq.id, 'host') })
            .then(() => { return sut.start(newReq.id, 'host2')})
            .then(() => { return sut.activeBuilds(1, 10)})
            .should.eventually.have.lengthOf(2)
            .and.satisfy(items => { return items[0].buildRequest.id === newReq.id && items[0].agentURL === 'host2' })
            .and.satisfy(items => { return items[1].buildRequest.id === oldReq.id && items[1].agentURL === 'host' })
            .and.notify(done);
    });

    it('finished builds should have most recently finished builds first on the list', (done) => {
        let oldRes = createBuildResult();
        oldRes.request = createBuildRequest();
        oldRes.request.id = 'test_id_old';
        oldRes.finishedTimestamp.setTime(oldRes.finishedTimestamp.getTime() - 100000);

        let newRes = createBuildResult();
        newRes.request = createBuildRequest();
        newRes.request.id = 'test_id_new';

        sut.add(oldRes.request)
            .then(() => { return sut.add(newRes.request) })
            .then(() => { return sut.start(oldRes.request.id, 'host') })
            .then(() => { return sut.start(newRes.request.id, 'host2')})
            .then(() => { return sut.finish(oldRes) })
            .then(() => { return sut.finish(newRes) })
            .then(() => { return sut.finishedBuilds(1, 10) })
            .should.eventually.have.lengthOf(2)
            .and.satisfy(items => { return items[0].request.id === newRes.request.id })
            .and.satisfy(items => { return items[1].request.id === oldRes.request.id })
            .and.notify(done);
    });


    it('next() should fetch the oldest request in the queue', (done) => {
        let oldReq = createBuildRequest();
        oldReq.id = 'test_id_old';
        oldReq.requestTimestamp.setTime(oldReq.requestTimestamp.getTime() - 100000);

        let newReq = createBuildRequest();
        newReq.id = 'test_id_new';
        newReq.requestTimestamp = new Date();

        sut.add(newReq)
            .then(() => { return sut.add(oldReq) })
            .then(() => { return sut.nextScheduledBuild(testUser) })
            .should.eventually.satisfy(request => { return request.id === oldReq.id})
            .and.notify(done);
    });

    it('should move a request from the scheduled queue to active builds when the request is started', (done) =>{
        let req = createBuildRequest();
        let req2 = createBuildRequest();
        req2.id = 'test_id_2';
        req2.requestTimestamp.setTime(req2.requestTimestamp.getTime() + 10000);
        let agentUrl = 'http://fake.url';

        sut.add(req)
            .then(() => {return sut.add(req2)})
            .then(() => {return sut.start(req.id, agentUrl)})
            .then(() => {return Q.all([sut.activeBuilds(1, 10), sut.queuedBuilds(testUser, 1, 10)])})
            .should.eventually.satisfy((result) => {
                let activeBuilds : Array<model.ActiveBuild> = result[0];
                return activeBuilds.length === 1
                    && activeBuilds[0].buildRequest.id === req.id;
            })
            .and.satisfy((result) => {
                let scheduledBuilds : Array<model.BuildRequest> = result[1];
                return scheduledBuilds.length === 1;
            })
            .and.notify(done);
    });

    it('should move a request from the active builds list to finished builds when it is finished', (done) =>{
        let req = createBuildRequest();
        req.id = 'testId';

        let res = createBuildResult();
        res.request = req;

        sut.add(req)
            .then(() => {return sut.start(req.id, 'host')})
            .then(() => {return sut.finish(res)})
            .then(() => {return Q.all([sut.activeBuilds(1, 10), sut.finishedBuilds(1, 10)])})
            .should.eventually.satisfy((result) => {
                let activeBuilds : Array<model.ActiveBuild> = result[0];
                return activeBuilds.length === 0;
            })
            .and.satisfy((result) => {
                let finishedBuilds : Array<model.BuildResult> = result[1];
                return finishedBuilds.length === 1
                    && finishedBuilds[0].request.id === req.id;
            })
            .and.notify(done);
    });

});
