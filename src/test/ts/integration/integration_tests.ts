import {start, App} from '../../../../src/main/ts/app';
import {doGet} from '../support/Requester';
import {expect} from 'chai';

import {setupChai} from '../test_utils'

setupChai();

describe('Boostrap', () => {

    var app : App;

    beforeEach( (done) => {
        let args = {
            local : true,
            mockAgents : true,
            mockAuth : true
        };
        app = start(args);
        setTimeout(() => done(), 1000);
    });

    afterEach( (done) => {
        app.stop();
        setTimeout(() => done(), 1000);
    });

    it('should return pong on /ping',  async function(done) {
        let res = await doGet('/ping');
        expect(res).equals('pong');
        done();
    });

});



