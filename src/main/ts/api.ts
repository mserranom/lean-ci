import {model} from './model';
import {builder} from './builder';
import {repository} from './repository';
import {config} from './config';

export module api {

    export class ExpressServer {

        private _server : any;

        start() : any {
            var express : any = require('express');
            var bodyParser : any = require('body-parser');
            var multer : any = require('multer');

            var app = express();
            app.use(bodyParser.json()); // for parsing application/json
            app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
            app.use(multer()); // for parsing multipart/form-data

            this._server = app.listen(config.defaultPort, () => {
                var host = this._server.address().address;
                var port = this._server.address().port;
                console.log('http server listening at http://%s:%s', host, port);
            });

            return app;
        }

        stop() {
            this._server.close();
        }
    }

    export class LeanCIApi {

        private _queue : model.BuildQueue;
        private _builder : builder.BuildScheduler;
        private _resultRepository : repository.MongoDBRepository<model.BuildResult>;

        constructor(queue : model.BuildQueue, builder : builder.BuildScheduler, repo : repository.MongoDBRepository<model.BuildResult>) {
            this._queue = queue;
            this._builder = builder;
            this._resultRepository = repo;
        }

        setup(app) {

            app.get('/ping', (req, res) => {
                console.info('received /ping GET request');
                res.send('pong');
            });

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
                let onResult = (data : Array<model.BuildResult>) => res.send(JSON.stringify(data));
                let onError = (error) => {
                    res.status = 500;
                    res.end();
                };
                this._resultRepository.fetch({}, 1, 10, onError, onResult);
            });

        }

    }

}