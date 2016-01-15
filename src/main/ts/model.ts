"use strict";

export module model {

    export interface UserCredentialsSchema {
        userId : string; // unique index
        token : string;
    }

    export interface RepositorySchema {
        userId : string;
        name : string; // unique index
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
        commands : Array<string>;
    }

    export interface BuildSchema {
        _id : string;
        status : BuildStatus;
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

    export function createBuildSchema() : model.BuildSchema {
        return {
            _id : undefined,
            status : BuildStatus.IDLE,
            repo : undefined,
            commit : undefined,
            userId : undefined,
            requestTimestamp : undefined,
            processedTimestamp : undefined,
            finishedTimestamp : undefined,
            log : undefined,
            config : undefined,
        }
    }
}
