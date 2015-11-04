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

    export interface BuildRequest {
        id : string,
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

    export interface ActiveBuild {
        agentURL : string;
        buildRequest : BuildRequest;
    }

    export interface BuildConfig {
        command : string;
    }

    export interface BuildResult {
        request : BuildRequest;
        succeeded : boolean;
        buildConfig : BuildConfig;
        log : string;
        startedTimestamp : Date;
        finishedTimestamp : Date;
    }
}
