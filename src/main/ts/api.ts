"use strict";

import {model} from './model';
import {config} from './config';
import {auth} from './auth';

import {Inject, PostConstruct} from 'container-ts';

import {configureExpress} from './rest/express_decorators';

import {Ping} from './rest/Ping';
import {Pipelines} from './rest/Pipelines';
import {BuildRequests} from './rest/BuildRequests';
import {Builds} from './rest/Builds';
import {DependencyGraphs} from './rest/DependencyGraphs';
import {Repositories} from './rest/Repositories';

export module api {

    export class ExpressServer {

        private _server : any;

        private _app : any;

        @Inject('authenticationService')
        auth : auth.AuthenticationService;

        @Inject('rest.Ping') ping : Ping;
        @Inject('rest.Pipelines') pipelines : Pipelines;
        @Inject('rest.BuildRequests') buildRequests : BuildRequests;
        @Inject('rest.Builds') builds : Builds;
        @Inject('rest.DependencyGraphs') dependencyGraphs : DependencyGraphs;
        @Inject('rest.Repositories') repositories : Repositories;

        constructor() {
            var express : any = require('express');
            var bodyParser : any = require('body-parser');
            var multer : any = require('multer');

            this._app = express();
            this._app.use(bodyParser.json()); // for parsing application/json
            this._app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
            this._app.use(multer()); // for parsing multipart/form-data

            this._app.use(this.authenticate.bind(this));
        }

        @PostConstruct
        init() : void {

            configureExpress(this._app, [this.ping, this.pipelines, this.buildRequests,
                this.builds, this.dependencyGraphs, this.repositories]);

            this._server = this._app.listen(config.httpServerPort);
        }

        authenticate(req, res, next) {
            let userId = req.get(auth.Headers.USER_ID);
            let userToken = req.get(auth.Headers.USER_TOKEN);
            let githubToken = req.get(auth.Headers.GITHUB_TOKEN);
            let privateApiSecret = req.get(auth.Headers.PRIVATE_API_SECRET);

            req.query.userId = userId; // for further usage as query parameter

            if(privateApiSecret == config.privateApiSecret) {
                next();
                return;
            }

            let onSuccess = (credentials : model.UserCredentialsSchema) => {
                res.set(auth.Headers.USER_ID, credentials.userId);
                res.set(auth.Headers.USER_TOKEN, credentials.token);
                res.set(auth.Headers.GITHUB_TOKEN, githubToken);
                next();
            };

            let onError = (error) => res.sendStatus(401);

            this.auth.authenticate(userId, userToken, githubToken, onError, onSuccess);
        }

        stop() {
            this._server.close();
        }
    }
}
