///<reference path="model.ts"/>
///<reference path="builder.ts"/>

import {model} from './model';
import {builder} from './builder';

export module api {

    export class LeanCIApi {

        private _queue : model.BuildQueue;

        constructor(queue : model.BuildQueue) {
            this._queue = queue;
        }

        start(app) {

            app.post('/github/push', (req, res) => {
                console.log('received /github/push POST request');
                res.end();

                console.info(JSON.stringify(req.body)); // https://developer.github.com/v3/activity/events/types/#pushevent
                let repo : string = req.body.repository.full_name;
                builder.queueBuild(repo);
            });

            app.post('/build/start', (req, res) => {
                console.log('received /build/start POST request');
                res.end();

                console.info(JSON.stringify(req.body));
                let repo : string = req.body.repo;
                console.log(repo);
                builder.queueBuild(repo);
            });

            app.get('/build/queue', (req, res) => {
                console.log('received /build/queue GET request');

                let result = [];
                this._queue.queue().forEach(project => result.push(project.toJSONObject()));

                res.send(JSON.stringify(result));
            });

            app.get('/build/active', (req, res) => {
                console.log('received /build/active GET request');

                let result = [];
                this._queue.activeBuilds().forEach(project => result.push(project.toJSONObject()));

                res.send(JSON.stringify(result));
            });

            app.get('/build/finished', (req, res) => {
                console.log('received /build/active GET request');

                let result = [];
                this._queue.finished().forEach(project => result.push(project.toJSONObject()));

                res.send(JSON.stringify(result));
            });

        }

    }

}