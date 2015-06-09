///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>

import Immutable = require('immutable');

export module model {

    export class BuildQueue {

        private _queue : Array<Project> = [];

        private _activeBuilds : Immutable.Set<Project> = Immutable.Set<Project>();

        add(repo : Project) {
            this._queue.push(repo);
        }

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

        finish(repo : Project) {
            this._activeBuilds = this._activeBuilds.delete(repo);
            repo.downstreamDependencies.forEach(dep => this.add(dep.downstream));
        }

        activeBuilds() : Immutable.Set<Project> {
            return this._activeBuilds;
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