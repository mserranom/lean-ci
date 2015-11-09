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
        QUEUED,
        RUNNING,
        FAILED,
        SUCCESS
    }

    export interface Build {
        _id? : string;
        userId : string;
        repo : string;
        commit : string;
        pingURL : string;
        requestTimestamp : Date;
        processedTimestamp : Date;
        finishedTimestamp : Date;
        status : BuildStatus;
        log : string;
    }
}
