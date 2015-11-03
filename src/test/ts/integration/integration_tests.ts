import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {doGet, doPost, doDel, USER_ID} from '../support/Requester';
import {expect} from 'chai';

import {setupChai} from '../test_utils'

setupChai();

describe('integration tests:', () => {

    var app : App;

    beforeEach( (done) => {
        let args = {
            local : true,
            mockAgents : true,
            mockAuth : true
        };
        app = start(args);
        setTimeout(() => done(), 10);
    });

    afterEach( (done) => {
        app.stop();
        cleanup();
        setTimeout(() => done(), 10);
    });

    describe('/ping', () => {

        it('should return pong',  async function(done) {
            let res = await doGet('/ping');
            expect(res).equals('pong');
            done();
        });
    });

    describe('/build_requests', () => {

        it('POST build request',  async function(done) {
            let repoName = 'organisation/repo1';
            await doPost('/repositories', {name : repoName});

            let request : model.BuildRequest = await doPost('/build_requests', {repo : 'organisation/repo1'});

            expect(request).not.to.be.null;
            expect(request.repo).equals(repoName);
            expect(request.user).equals(USER_ID);
            expect(request.requestTimestamp).not.to.be.null;
            expect(request.processedTimestamp).to.be.null
            done();
        });

        it('GET paged build requests',  async function(done) {

            let repoName = 'organisation/repo1';
            await doPost('/repositories', {name : repoName});

            for(var i = 0; i < 15; i++) {
                await doPost('/build_requests', {repo : repoName});
            }

            let result : Array<model.BuildRequest> = await doGet('/build_requests?page=1&per_page=14');

            expect(result.length).equals(14);

            let list : any = result; // cast to use chai-things
            list.should.all.have.property('repo', repoName);

            done();
        });
    });

    describe('/repositories', () => {

        it('POST repository',  async function(done) {
            await doPost('/repositories', {name : 'organisation/repo1'});

            let repositories : Array<model.Repository> = await doGet('/repositories');
            expect(repositories.length).equals(1);
            expect(repositories[0].name).equals('organisation/repo1');
            expect(repositories[0].userId).equals(USER_ID);
            done();
        });

        it('GET single repository',  async function(done) {
            await doPost('/repositories', {name : 'organisation/repo1'});

            let automaticallyGivenID = 2;
            let repository : model.Repository = await doGet('/repositories/' + automaticallyGivenID);

            expect(repository.name).equals('organisation/repo1');
            expect(repository.userId).equals(USER_ID);
            done();
        });

        it('GET paged repositories',  async function(done) {
            for(var i = 0; i < 15; i++) {
                await doPost('/repositories', {name : 'organisation/repo' + i});
            }

            let repositories : Array<model.Repository> = await doGet('/repositories?page=1&per_page=12');

            let pageSize = 12;
            expect(repositories.length).equals(pageSize);
            done();
        });

        it('DELETE single repository',  async function(done) {
            await doPost('/repositories', {name : 'organisation/repo1'});

            let repositories : Array<model.Repository> = await doGet('/repositories');
            expect(repositories.length).equals(1);

            let id = repositories[0]._id;

            await doDel('/repositories/' + id);

            repositories = await doGet('/repositories');

            expect(repositories.length).equals(0);
            done();
        });

    });

});



