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

    it('next() should fetch the oldest request in the queue', (done) => {
        let oldReq = createBuildRequest();
        oldReq.id = 'test_id_old';
        oldReq.requestTimestamp.setTime(oldReq.requestTimestamp.getTime() - 100000);

        let newReq = createBuildRequest();
        newReq.id = 'test_id_new';
        newReq.requestTimestamp = new Date();

        sut.add(newReq)
            .then(() => { return sut.add(oldReq) })
            .then(() => { return sut.nextQueuedBuild(testUser) })
            .should.eventually.satisfy(request => { return request.id === oldReq.id})
            .and.notify(done);
    });

});
