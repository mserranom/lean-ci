import {model} from './model';
import {builder} from './builder';
import {repository} from './repository';
import {config} from './config';
import {auth} from './auth';

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
        private _resultRepository : repository.DocumentRepository<model.BuildResult>;
        private _auth : auth.AuthenticationService;

        constructor(queue : model.BuildQueue, builder : builder.BuildScheduler, repo : repository.DocumentRepository<model.BuildResult>,
                        auth : auth.AuthenticationService) {
            this._queue = queue;
            this._builder = builder;
            this._resultRepository = repo;
            this._auth = auth;
        }

        private authenticate(req, res, next) {
            let userId = req.get('x-lean-ci-user-id');
            let userToken = req.get('x-lean-ci-user-token');
            let githubToken = req.get('x-lean-ci-github-token');

            console.info('login headers read: (' + userId + ',' + userToken + ',' + githubToken + ')');

            let onSuccess = (credentials : model.UserCredentials) => {
                res.set('x-lean-ci-user-id', credentials.userId);
                res.set('x-lean-ci-user-token', credentials.userId);
                res.set('x-lean-ci-github-token', githubToken);
                next();
            };

            let onError = (error) => res.sendStatus(401);

            this._auth.authenticate(userId, userToken, githubToken, onError, onSuccess);
        }

        setup(app) {

            let auth = (req, res,next) => this.authenticate(req, res,next);

            app.get('/ping', auth, (req, res) => {
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

            app.post('/auth', (req, res) => {
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
                let page = req.query.page ? parseInt(req.query.page) : 1;
                let perPage = req.query.page ? parseInt(req.query.per_page) : 10;
                this._resultRepository.fetch({}, page, perPage, onError, onResult,
                    cursor => cursor.sort({'finishedTimestamp' : -1}));
            });

        }

    }

}