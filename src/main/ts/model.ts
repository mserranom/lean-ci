///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>

import * as Immutable from "immutable"

export module model {

    export interface UserCredentials {
        userId : string;
        token : string;
    }

    export interface Repository {
        userId : string;
        name : string; // index
    }

    export enum BuildStatus {
        IDLE,
        QUEUED,
        RUNNING,
        FAILED,
        SUCCESS
    }

    export interface BuildConfig {
        dependencies : Array<string>;
    }

    export interface Job {
        _id : string;
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
        config : BuildConfig;
    }

    export interface Dependency {
        up : string;
        down : string;
    }

    export interface Pipeline {
        jobs : Array<Job>
        dependencies : Array<Dependency>
    }

    export interface PipelineSchema {
        _id : string;
        userId : string;
        jobs : Array<string>
        dependencies : Array<Dependency>
    }

    export interface DependencyGraphSchema {
        _id : string;
        userId : string;
        repos : Array<string>;
        dependencies : Array<Dependency>;
    }
}
