///<reference path="../../../typings/tsd.d.ts"/>

"use strict";

// required to enable async/await
try  {
    require("babel/polyfill");
}
catch(error) {
    // no action, this in case it tryes to be required twice
}


import {model} from '../../../src/main/ts/model';

var simple = require('simple-mock');

var Q = require('q');
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

export async function sleep(ms:number) : Promise<any> {
    return new Promise<void>(function(resolve) {
        setTimeout(function(){ resolve() }, ms);
    });
}