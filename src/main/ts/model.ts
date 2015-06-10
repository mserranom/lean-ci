///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>

import Immutable = require('immutable');

export module model {

    export class BuildQueue {

        private _queue : Array<Project> = [];

        private _finished : Array<Project> = [];

        private _activeBuilds : Immutable.Set<Project> = Immutable.Set<Project>();

        /** adds a project to the queue */
        add(repo : Project) {
            this._queue.push(repo);
        }

        /** moves a project to active builds and returns the activated project */
        next() : Project {
           if(this.queueIsEmpty() || this.maxConcurrentBuildsReached()){
               return null;
           }
           for(let i = 0; i < this._queue.length; i++) {
               let repo = this._queue[i];
               if(!this.isActive(repo)) {
                   this._activeBuilds = this._activeBuilds.add(repo);
                   this._queue.splice(i, 1);
                   return repo;
               }
           }
           return null;
        }

        /** finishes an active build, removing it from the set of active builds */
        finish(repo : Project) {
            this._activeBuilds = this._activeBuilds.delete(repo);
            repo.downstreamDependencies.forEach(dep => this.add(dep.downstream));
            this._finished.push(repo);
        }

        /** project builds that are active at the moment */
        activeBuilds() : Immutable.Set<Project> {
            return this._activeBuilds;
        }

        queue() : Array<Project> {
            return this._queue;
        }

        finished() : Array<Project> {
            return this._finished;
        }

        private isActive(build:Project) : boolean {
            return this._activeBuilds.some(activeBuild => activeBuild.repo == build.repo);
        }

        private maxConcurrentBuildsReached() : boolean {
            return this._activeBuilds.count() >= 1;
        }

        private queueIsEmpty() : boolean {
             return this._queue.length <= 0
        }

    }

    export interface ProjectDependency {
        upstream : Project;
        downstream : Project;
    }

    export class Project {
        repo : string;
        upstreamDependencies : Immutable.Set<ProjectDependency> = Immutable.Set<ProjectDependency>();
        downstreamDependencies : Immutable.Set<ProjectDependency> = Immutable.Set<ProjectDependency>();

        constructor(repo : string) {
            this.repo = repo;
        }

        toJSONObject() {
            let result : any =  {repo : this.repo};
            result.upstreamDependencies = [];
            result.downstreamDependencies = [];
            this.upstreamDependencies.forEach(dep => result.upstreamDependencies.push(dep.upstream.repo));
            this.downstreamDependencies.forEach(dep => result.downstreamDependencies.push(dep.downstream.repo));
            return result;
        }
    }

    export class AllProjects {

        private _projects : Immutable.Map<string, Project> = Immutable.Map<string, Project>();

        populateTestData() {
            let repo1 = 'mserranom/lean-ci-testA';
            let repo2 = 'mserranom/lean-ci-testB';
            let repo3 = 'mserranom/lean-ci';

            this.addNewProject(repo1);
            this.addNewProject(repo2);
            this.addNewProject(repo3);

            this.setDependency(repo1, repo2);
            this.setDependency(repo2, repo3);
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
            let project = new Project(repo);
            this._projects = this._projects.set(repo, project);
        }

        setDependency(upstream : string, downstream : string) {
            let p1 = this._projects.get(upstream);
            let p2 = this._projects.get(downstream);
            let dep : ProjectDependency = {upstream : p1, downstream : p2};
            p1.downstreamDependencies = p1.downstreamDependencies.add(dep);
            p2.upstreamDependencies = p2.upstreamDependencies.add(dep);
        }

    }

}