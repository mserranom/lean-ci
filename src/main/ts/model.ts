///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>

"use strict";

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

    export enum PipelineStatus {
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

    export interface PipelineSchema {
        _id? : string;
        userId : string;
        status :  PipelineStatus;
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
