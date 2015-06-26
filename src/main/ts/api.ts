///<reference path="model.ts"/>
///<reference path="builder.ts"/>

import {model} from './model';
import {builder} from './builder';

export module api {

    export class LeanCIApi {

        private _queue : model.BuildQueue;
        private _builder : builder.BuildScheduler;

        constructor(queue : model.BuildQueue, builder : builder.BuildScheduler) {
            this._queue = queue;
            this._builder = builder;
        }

        start(app) {

            app.post('/github/push', (req, res) => {
                console.info('received /github/push POST request');
                res.end();

                console.info(JSON.stringify(req.body)); // https://developer.github.com/v3/activity/events/types/#pushevent
                let repo : string = req.body.repository.full_name;
                let commit : string = req.body.head_commit.id;
                this._builder.queueBuild(repo, commit);
            });

            app.post('/build/start', (req, res) => {
                console.info('received /build/start POST request');
                res.end();

                console.info(JSON.stringify(req.body));
                let repo : string = req.body.repo;
                console.log(repo);
                this._builder.queueBuild(repo);
            });

            app.get('/build/queue', (req, res) => {
                console.info('received /build/queue GET request');
                res.send(JSON.stringify(this._queue.queue()));
            });

            app.post('/build/pingFinish', (req, res) => {
                let buildId : string = req.query.id;
                console.info('received /build/pingFinish GET request, build id=' + buildId);
                this._builder.pingFinish(req.body);
                res.end();
            });

            app.get('/build/active', (req, res) => {
                console.info('received /build/active GET request');
                res.send(JSON.stringify(this._queue.activeBuilds()));
            });

            app.get('/build/finished', (req, res) => {
                console.info('received /build/active GET request');
                res.send(JSON.stringify(this._queue.finished()));
            });

        }

    }

}