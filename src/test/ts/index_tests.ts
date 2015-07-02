///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>

import {config} from '../../../src/main/ts/config';
import {api} from '../../../src/main/ts/api';
import {start, stop} from './mock/index_mock';

import {expect} from 'chai';

var http : any = require('http');

describe('index_mock', () => {

    let tearDown : () => void;

    beforeEach((done) => {
        start(ctx => {
            tearDown = () => stop(ctx);
            done()
        });
    });

    afterEach(() => {
        tearDown();
    });

    //it('should return 200 on ping', (done) => {
    //    http.get(config.appUrl + '/ping', function (res) {
    //        expect(res.statusCode).equals(200);
    //        done();
    //    });
    //});

});