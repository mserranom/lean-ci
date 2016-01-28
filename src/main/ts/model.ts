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

    export class BuildStatus {
        static IDLE = 'idle';
        static QUEUED = 'queued';
        static RUNNING = 'running';
        static FAILED = 'failed';
        static SUCCESS = 'success';
        static SKIPPED = 'skipped';
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
        createdTimestamp : Date;
        queuedTimestamp : Date;
        startedTimestamp : Date;
        finishedTimestamp : Date;
        log : string;
        config : BuildConfig;
    }

    export interface Dependency {
        up : string;
        down : string;
    }

    export enum PipelineStatus {
        RUNNING,
        FAILED,
        SUCCESS
    }

    export interface PipelineSchema {
        _id : string;
        userId : string;
        status :  PipelineStatus;
        jobs : Array<string>
        dependencies : Array<Dependency>,
        createdTimestamp : Date,
        finishedTimestamp : Date,
    }

    export interface DependencyGraphSchema {
        _id : string;
        userId : string;
        repos : Array<string>;
        dependencies : Array<Dependency>;
    }

    export function newBuildSchema() : model.BuildSchema {
        return {
            _id : undefined,
            status : BuildStatus.IDLE,
            repo : undefined,
            commit : undefined,
            userId : undefined,
            createdTimestamp : undefined,
            queuedTimestamp : undefined,
            startedTimestamp : undefined,
            finishedTimestamp : undefined,
            log : undefined,
            config : undefined,
        }
    }

    export function newPipelineSchema() : model.PipelineSchema {
        return {
            _id: undefined,
            userId: undefined,
            status: model.PipelineStatus.RUNNING,
            jobs: [],
            dependencies: [],
            createdTimestamp: undefined,
            finishedTimestamp: undefined
        };
    }

    export function isValidBuildStatusTransition(oldStatus : BuildStatus, newStatus : BuildStatus) : boolean {

        if(newStatus != model.BuildStatus.RUNNING
            && newStatus != model.BuildStatus.SUCCESS
            && newStatus != model.BuildStatus.FAILED) {

            return false;
        }

        if(newStatus == model.BuildStatus.IDLE
            || (oldStatus == model.BuildStatus.QUEUED && newStatus != model.BuildStatus.IDLE )
            || (oldStatus == model.BuildStatus.RUNNING && newStatus == model.BuildStatus.SUCCESS)
            || (oldStatus == model.BuildStatus.RUNNING && newStatus == model.BuildStatus.FAILED)){

            return true;
        }

        return false;
    }
}
