///<reference path="../../../lib/mocha.d.ts"/>
///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/chai-as-promised.d.ts"/>

import {model} from '../../../src/main/ts/model';

var simple = require('simple-mock');

var Q = require('Q');
simple.Promise = Q;

export var TINGODB_PATH = 'dist';

export function setupChai() {
    var chai = require('chai');
    chai.should(); // enables use of should object

    var chaiAsPromised = require('chai-as-promised');
    chai.use(chaiAsPromised);

    //TODO: include d.ts file
    var chaiThings = require('chai-things');
    chai.use(chaiThings);
}

export function spy(methods : Array<string>) : any {
    let mock = {};
    methods.forEach(method => mock[method] = simple.spy(() => {}));
    return mock;
}

export function stubPromise(value? : any) : any {
    return simple.stub().returnWith(Q.Promise.resolve(value));
}

export function stubRejectedPromise(reason? : string) : any {
    return simple.stub().rejectWith(reason);
}


export function createBuildRequest() : model.BuildRequest {
    return new BuildRequestImpl();
}

export function createBuildResult() : model.BuildResult {
    let result = new BuildResultImpl();
    result.request = new BuildRequestImpl();
    return result;
}

export function createActiveBuild() : model.ActiveBuild {
    let result = new ActiveBuildImpl();
    result.buildRequest = new BuildRequestImpl();
    return result;
}

class ActiveBuildImpl implements model.ActiveBuild {
    agentURL : string = 'http://test_agent_host';
    buildRequest : model.BuildRequest;
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

