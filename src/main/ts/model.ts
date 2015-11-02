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

    export interface BuildRequest {
        id : string,
        user : string;
        repo : string;
        commit : string;
        pingURL : string;
        requestTimestamp : Date;
        processedTimestamp : Date;
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

    export class Project {
        repo : string;
    }

    export class BuildQueue {

        private _queue : Array<BuildRequest> = [];

        private _activeBuilds : Immutable.Set<BuildRequest> = Immutable.Set<BuildRequest>();

        /** adds a project to the queue */
        add(repo : BuildRequest) {
            this._queue.push(repo);
        }

        /** moves a project to active builds and returns the activated project */
        next() : BuildRequest {
           if(this.queueIsEmpty() || this.maxConcurrentBuildsReached()){
               return null;
           }
           for(let i = 0; i < this._queue.length; i++) {
               let nextRequest = this._queue[i];
               if(!this.isActive(nextRequest.repo)) {
                   this._activeBuilds = this._activeBuilds.add(nextRequest);
                   this._queue.splice(i, 1);
                   return nextRequest;
               }
           }
           return null;
        }

        /** finishes an active build, removing it from the set of active builds */
        finish(repo : BuildRequest) {
            this._activeBuilds = this._activeBuilds.delete(repo);
        }

        /** project builds that are active at the moment */
        activeBuilds() : Immutable.Set<BuildRequest> {
            return this._activeBuilds;
        }

        queue() : Array<BuildRequest> {
            return this._queue;
        }

        private isActive(repo:string) : boolean {
            return this._activeBuilds.some(activeBuild => activeBuild.repo == repo);
        }

        private maxConcurrentBuildsReached() : boolean {
            return this._activeBuilds.count() >= 1;
        }

        private queueIsEmpty() : boolean {
             return this._queue.length <= 0
        }

    }

    export class AllProjects {

        private _projects : Immutable.Map<string, Project> = Immutable.Map<string, Project>();

        populateTestData() {
            this.addNewProject('mserranom/lean-ci-testA');
            this.addNewProject('mserranom/lean-ci-testB');
            this.addNewProject('mserranom/lean-ci');
        }

        getProjects() : Array<Project> {
            let projects : Array<Project> = [];
            this._projects.forEach((project,repo) => projects.push(project));
            return projects;
        }

        getProject(repo : string) : Project {
            return this._projects.get(repo);
        }

        addNewProject(repo : string) {
            let project : Project =  { repo : repo };
            this._projects = this._projects.set(repo, project);
        }

    }

}
