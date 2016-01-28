"use strict";

import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {doGet, doPost, doDel, USER_ID} from '../support/Requester';

import {setupChai} from '../test_utils'

var expect = require('chai').expect;
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

        it('GET paged repositories',  async function(done) {
            for(var i = 0; i < 15; i++) {
                await doPost('/repositories', {name : 'organisation/repo' + i});
            }

            let repositories : Array<model.RepositorySchema> = await doGet('/repositories?page=1&per_page=12');

            let pageSize = 12;
            expect(repositories.length).equals(pageSize);
            done();
        });

        it('DELETE single repository',  async function(done) {
            await doPost('/repositories', {name : 'organisation/repo1'});

            let repositories : Array<model.RepositorySchema> = await doGet('/repositories');
            expect(repositories.length).equals(1);

            let id = repositories[0]['_id'];

            await doDel('/repositories/' + id);

            repositories = await doGet('/repositories');

            expect(repositories.length).equals(0);
            done();
        });

    });

});



