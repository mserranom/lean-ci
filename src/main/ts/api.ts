import {model} from './model';
import {builder} from './builder';
import {repository} from './repository';
import {config} from './config';
import {auth} from './auth';
import {github} from './github';

import {Inject} from '../../../lib/container';

var validate = require('express-validation');
var Joi = require('joi');

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

        @Inject('buildQueue')
        queue : model.BuildQueue;

        @Inject('buildScheduler')
        builder : builder.BuildScheduler;

        @Inject('buildResultsRepository')
        buildResults : repository.DocumentRepository<model.BuildResult>;

        @Inject('repositoriesRepository')
        repositories : repository.DocumentRepository<model.Repository>;

        @Inject('authenticationService')
        auth : auth.AuthenticationService;

        @Inject('githubApi')
        github : github.GithubAPI;

        private _app : any;

        private authenticate(req, res, next) {
            let userId = req.get('x-lean-ci-user-id');
            let userToken = req.get('x-lean-ci-user-token');
            let githubToken = req.get('x-lean-ci-github-token');

            console.info('login headers read: (' + userId + ',' + userToken + ',' + githubToken + ')');

            let onSuccess = (credentials : model.UserCredentials) => {
                res.set('x-lean-ci-user-id', credentials.userId);
                res.set('x-lean-ci-user-token', credentials.token);
                res.set('x-lean-ci-github-token', githubToken);
                next();
            };

            let onError = (error) => res.sendStatus(401);

            this.auth.authenticate(userId, userToken, githubToken, onError, onSuccess);
        }

        setup(app) {

            this._app = app;

            let auth = (req, res, next) => this.authenticate(req, res,next);

            app.get('/ping', auth, (req, res) => {
                console.info('received /ping GET request');
                res.send('pong');
            });

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

            let repoVal =  {
                body: { name : Joi.string().required() }
            };

            app.post('/repositories', validate(repoVal), auth, (req,res) => {
                let userId = req.get('x-lean-ci-user-id');
                let repoName : string = req.body.name;

                console.info('received /repositories POST request');

                var data : model.Repository = {userId : userId, name : repoName};

                var onError = (error) => {
                    res.status = 500;
                    res.send(error);
                };

                let saveNewRepo = () => {
                    let onResult = () => res.end();
                    this.repositories.save(data, onError, onResult);
                };

                this.repositories.fetch(data, 1, 1, onError, (result) => {
                        if(result.length > 0) {
                            res.end();
                        } else {
                            this.github.getRepo(repoName)
                                .then(saveNewRepo).fail(onError);
                        }
                    });
            });

            app.delete('/repositories/:id', auth, (req,res) => {
                let userId = req.get('x-lean-ci-user-id');
                let id : string = req.params.id;

                console.info(`received /repositories/${id} DELETE request`);

                let onResult = () => res.end();

                let onError = (error) => {
                    res.status = 500;
                    res.end();
                };

                let query : any = {userId : userId, _id : id};

                this.repositories.remove(query, onError, onResult);
            });

            app.get('/repositories', auth, (req,res) => {
                console.info('received /repositories GET request');
                let userId = req.get('x-lean-ci-user-id');
                let onResult = (data : Array<model.Repository>) => res.send(JSON.stringify(data));
                let onError = (error) => {
                    res.status = 500;
                    res.end();
                };
                let page = req.query.page ? parseInt(req.query.page) : 1;
                let perPage = req.query.page ? parseInt(req.query.per_page) : 10;
                this.repositories.fetch({userId : userId}, page, perPage, onError, onResult,
                        cursor => cursor.sort({'finishedTimestamp' : -1}));
            });

            app.get('/repositories/:id', auth, (req,res) => {
                console.info('received /repositories GET request');
                let userId = req.get('x-lean-ci-user-id');
                let id : string = req.params.id;

                let onResult = (data : Array<model.Repository>) => res.send(JSON.stringify(data));
                let onError = (error) => {
                    res.status = 500;
                    res.end();
                };

                this.repositories.fetchFirst({userId : userId, _id : id}, onError, onResult);
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
