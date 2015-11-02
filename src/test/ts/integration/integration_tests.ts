import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {doGet, doPost, USER_ID} from '../support/Requester';
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

    describe('/repositories', () => {

        it('POST single repository',  async function(done) {
            await doPost('/repositories', {name : 'organisation/repo1'});

            let repositories : Array<model.Repository> = await doGet('/repositories');
            expect(repositories.length).equals(1);
            expect(repositories[0].name).equals('organisation/repo1');
            expect(repositories[0].userId).equals(USER_ID);
            done();
        });

        //it('GET single repository',  async function(done) {
        //    let repo = {repo : 'organisation/repo1'};
        //    await doPost('/repositories', repo);
        //
        //    let fetchedRepo : model.Repository = await doGet('/repositories/' + encodeURIComponent('organisation/repo1'));
        //    //expect(fetchedRepo.name).equals('organisation/repo1');
        //    //expect(fetchedRepo.userId).equals(USER_ID);
        //    done();
        //});
    });

});



