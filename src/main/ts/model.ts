///<reference path='../../../node_modules/immutable/dist/Immutable.d.ts'/>

import Immutable = require('immutable');

export module model {

    export interface ScheduledBuild {
        repo : string;
    }

    export class BuildQueue {

        private _queue : Array<ScheduledBuild> = [];

        private _activeBuilds : Immutable.Set<ScheduledBuild> = Immutable.Set<ScheduledBuild>();

        add(repo : ScheduledBuild) {
            this._queue.push(repo);
        }

        next() : ScheduledBuild {
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

        finish(repo : ScheduledBuild) {
            this._activeBuilds = this._activeBuilds.delete(repo);
        }

        activeBuilds() : Immutable.Set<ScheduledBuild> {
            return this._activeBuilds;
        }

        private isActive(build:ScheduledBuild) : boolean {
            return this._activeBuilds.some(activeBuild => activeBuild.repo == build.repo);
        }

        private maxConcurrentBuildsReached() : boolean {
            return this._activeBuilds.count() > 2;
        }

        private queueIsEmpty() : boolean {
             return this._queue.length <= 0
        }

    }

}