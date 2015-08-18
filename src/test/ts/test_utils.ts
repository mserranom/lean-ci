///<reference path="../../../lib/mocha.d.ts"/>
///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/chai-as-promised.d.ts"/>

import {model} from '../../../src/main/ts/model';

export var TINGODB_PATH = 'target/test';

export function setupChai() {
    var chai = require('chai');
    chai.should(); // enables use of should object

    var chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);

    //TODO: include d.ts file
    var chaiThings = require('chai-things');
    chai.use(chaiThings);
}


export function createBuildRequest() : model.BuildRequest {
    return new BuildRequestImpl();
}

export function createBuildResult() : model.BuildResult {
    return new BuildResultImpl();
}


class BuildResultImpl implements model.BuildResult {
    request : model.BuildRequest;
    succeeded : boolean;
    buildConfig : model.BuildConfig;
    log : string = 'result log';
    startedTimestamp : Date = new Date();
    finishedTimestamp : Date  = new Date();
}

class BuildRequestImpl implements model.BuildRequest {
    id : string = '12-34';
    user : string = 'user_test';
    repo : string = 'repo/name';
    commit : string;
    pingURL : string = 'http://localhost/ping';
    requestTimestamp : Date = new Date();
    processedTimestamp : Date = new Date();
}

