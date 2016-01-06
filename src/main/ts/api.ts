"use strict";

import {model} from './model';
import {config} from './config';
import {auth} from './auth';

import {Inject, PostConstruct} from '../../../lib/container';

import {configureExpress} from './rest/express_decorators';
import {Ping} from './rest/Ping';
import {Pipelines} from './rest/Pipelines';
import {BuildRequests} from './rest/BuildRequests';
import {Builds} from './rest/Builds';

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

            configureExpress(this._app, [this.ping, this.pipelines, this.buildRequests, this.builds]);

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
            if(validator) {
                var validate = require('express-validation');
                this._app[method](endpoint, validate(validator), this.wrapHandler(handler));
            } else {
                this._app[method](endpoint, this.wrapHandler(handler));
            }
        }

        private wrapHandler(handler : (req:any, res:any, userId : string) => void) : (rq:any, rs:any) => void {
            return (req, res) => {
                let id = req.get(auth.Headers.USER_ID);
                handler(req, res, id);
            };
        }

        getPaged(endpoint : string, handler : (req : any, res : any, userId : string, page : number, perPage: number) => void) : void {
            this._app.get(endpoint, this.wrapPagerHandler(handler));
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

            let onSuccess = (credentials : model.UserCredentials) => {
                res.set(auth.Headers.USER_ID, credentials.userId);
                res.set(auth.Headers.USER_TOKEN, credentials.token);
                res.set(auth.Headers.GITHUB_TOKEN, githubToken);
                next();
            };

            let onError = (error) => res.sendStatus(401);

            req.query.userId = userId; // for further usage as query parameter

            this.auth.authenticate(userId, userToken, githubToken, onError, onSuccess);
        }

        app() : any {
            return this._app;
        }

        stop() {
            this._server.close();
        }
    }
}
