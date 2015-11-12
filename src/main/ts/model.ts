///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>

import * as Immutable from "immutable"

export module model {

    export interface UserCredentials {
        userId : string;
        token : string;
    }

    export interface Repository {
        _id? : string;
        userId : string;
        name : string;
    }

    export enum BuildStatus {
        IDLE,
        QUEUED,
        RUNNING,
        FAILED,
        SUCCESS
    }

    export interface Job {
        _id? : string;
        status : BuildStatus;
    }

    export interface Build extends Job {
        repo : string;
        commit : string;
        userId : string;
        pingURL : string;
        requestTimestamp : Date;
        processedTimestamp : Date;
        finishedTimestamp : Date;
        log : string;
    }

    export interface Dependency {
        up : string;
        down : string;
    }

    export interface Pipeline {
        _id? : string;
        jobs : Array<Job>
        dependencies : Array<Dependency>
    }
}
