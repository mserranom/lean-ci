import {model} from './model';
import {builder} from './builder';
import {repository} from './repository';
import {config} from './config';
import {auth} from './auth';
import {github} from './github';

import {Inject, PostConstruct} from '../../../lib/container';

export module api {

    export class ExpressServer {

        private _server : any;

        private _app : any;

        @Inject('authenticationService')
        auth : auth.AuthenticationService;

        constructor() {
            var express : any = require('express');
            var bodyParser : any = require('body-parser');
            var multer : any = require('multer');

            this._app = express();
            this._app.use(bodyParser.json()); // for parsing application/json
            this._app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
            this._app.use(multer()); // for parsing multipart/form-data
        }

        @PostConstruct
        init() : void {
            this._server = this._app.listen(config.defaultPort, () => {
                var host = this._server.address().address;
                var port = this._server.address().port;
                console.log('http server listening at http://%s:%s', host, port);
            });
        }

        get(endpoint : string, handler : (req : any, res : any, userId : string) => void) : void {
            this.request('get', endpoint, handler);
        }

        post(endpoint : string, validator : any, handler : (req : any, res : any, userId : string) => void) : void {
            this.request('post', endpoint, handler, validator);
        }

        del(endpoint : string, handler : (req : any, res : any, userId : string) => void) : void {
            this.request('delete', endpoint, handler);
        }

        private request(method : string, endpoint : string, handler : (req : any, res : any, userId : string) => void, validator? : any) : void {
            console.info('received ' + endpoint +  ' ' + method.toUpperCase() + ' request');
            let auth = (req, res, next) => this.authenticate(req, res,next);
            if(validator) {
                var validate = require('express-validation');
                this._app[method](endpoint, validate(validator), auth, this.wrapHandler(handler));
            } else {
                this._app[method](endpoint, auth, this.wrapHandler(handler));
            }
        }

        private wrapHandler(handler : (req:any, res:any, userId : string) => void) : (rq:any, rs:any) => void {
            return (req, res) => {
                let id = req.get(auth.Headers.USER_ID);
                handler(req, res, id);
            };
        }

        getPaged(endpoint : string, handler : (req : any, res : any, userId : string, page : number, perPage: number) => void) : void {
            console.info('received ' + endpoint +  ' ' + ' GET request');
            let auth = (req, res, next) => this.authenticate(req, res,next);
            this._app.get(endpoint, auth, this.wrapPagerHandler(handler));
        }

        private wrapPagerHandler(handler : (req:any, res:any, userId : string, page : number, perPage: number) => void) : (rq:any, rs:any) => void {
            return (req, res) => {
                let page = req.query.page ? parseInt(req.query.page) : 1;
                let perPage = req.query.per_page ? parseInt(req.query.per_page) : 10;
                let id = req.get(auth.Headers.USER_ID);
                handler(req, res, id, page, perPage);
            };
        }

        authenticate(req, res, next) {
            let userId = req.get(auth.Headers.USER_ID);
            let userToken = req.get(auth.Headers.USER_TOKEN);
            let githubToken = req.get(auth.Headers.GITHUB_TOKEN);

            console.info('login headers read: (' + userId + ',' + userToken + ',' + githubToken + ')');

            let onSuccess = (credentials : model.UserCredentials) => {
                res.set(auth.Headers.USER_ID, credentials.userId);
                res.set(auth.Headers.USER_TOKEN, credentials.token);
                res.set(auth.Headers.GITHUB_TOKEN, githubToken);
                next();
            };

            let onError = (error) => res.sendStatus(401);

            this.auth.authenticate(userId, userToken, githubToken, onError, onSuccess);
        }

        app() : any {
            return this._app;
        }

        stop() {
            this._server.close();
        }
    }

    export class LeanCIApi {

        @Inject('expressServer')
        expressServer : ExpressServer;

        @Inject('buildQueue')
        queue : model.BuildQueue;

        @Inject('buildScheduler')
        builder : builder.BuildScheduler;

        @Inject('buildResultsRepository')
        buildResults : repository.DocumentRepository<model.BuildResult>;

        @Inject('authenticationService')
        auth : auth.AuthenticationService;

        private _app : any;

        @PostConstruct
        init() {

            this._app = this.expressServer.app();
            let app = this._app;

            let auth = (req, res, next) => this.expressServer.authenticate(req, res,next);

            app.post('/github/push', (req, res) => {
                console.info('received /github/push POST request');
                res.end();

                console.info(JSON.stringify(req.body)); // https://developer.github.com/v3/activity/events/types/#pushevent
                let repo : string = req.body.buildResultsRepository.full_name;
                let commit : string = req.body.head_commit.id;
                this.builder.queueBuild(repo, commit);
            });

            app.post('/build/start', (req, res) => {
                console.info('received /build/start POST request');
                let repo : string = req.body.repo;
                let request = this.builder.queueBuild(repo);
                res.send(JSON.stringify(request));
            });

            app.get('/build/:id/log', (req, res) => {
                let buildId : string = req.params.id;
                let onResult = (data : model.BuildResult) => {
                    // TODO: what to do when it's undefined?
                    // TODO: proxy to the agent to stream the logs
                    res.send(JSON.stringify(data.log));
                };
                let onError = (error) => {
                    res.status = 500;
                    res.end();
                };
                this.buildResults.fetchFirst({"request.id" : buildId}, onError, onResult);
            });

            app.get('/build/queue', (req, res) => {
                console.info('received /build/queue GET request');
                res.send(JSON.stringify(this.queue.queue()));
            });

            app.post('/build/pingFinish', (req, res) => {
                let buildId : string = req.query.id;
                console.info('received /build/pingFinish POST request, build id=' + buildId);
                this.builder.pingFinish(req.body);
                res.end();
            });

            app.get('/build/active', (req, res) => {
                console.info('received /build/active GET request');
                res.send(JSON.stringify(this.queue.activeBuilds()));
            });


            app.get('/build/finished', auth, (req, res) => {
                console.info('received /build/active GET request');
                let onResult = (data : Array<model.BuildResult>) => res.send(JSON.stringify(data));
                let onError = (error) => {
                    res.status = 500;
                    res.end();
                };
                let page = req.query.page ? parseInt(req.query.page) : 1;
                let perPage = req.query.page ? parseInt(req.query.per_page) : 10;
                this.buildResults.fetch({}, page, perPage, onError, onResult,
                    cursor => cursor.sort({'finishedTimestamp' : -1}));
            });

            app.get('/nexus/credentials', auth, (req,res) => {
                let credentials = {
                    url : 'http://mserranom217-8081.terminal.com',
                    user: 'admin',
                    pass: 'Malaga1'
                };
                res.send(JSON.stringify(credentials));
            });
        }
    }
}
