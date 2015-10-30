import {start, App} from '../../../../src/main/ts/app';
import {doGet, doPost} from '../support/Requester';
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
        setTimeout(() => done(), 10);
    });

    describe('ping:', () => {

        it('should return pong',  async function(done) {
            let res = await doGet('/ping');
            expect(res).equals('pong');
            done();
        });
    });

    //describe('adding builds to the queue:', () => {
    //
    //    it('should succesfully add elements to the build queue',  async function(done) {
    //        let res = await doPost('/build/start', {repo : 'organisation/repo1'});
    //        //expect(res).equals('pong');
    //        done();
    //    });
    //});

});



