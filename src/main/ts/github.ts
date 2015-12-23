"use strict";

var Q = require('q');

export module github {

    export interface GitService {
        authenticate(token:String);
        user(id : string) : Q.Promise<any>;
        getRepo(name : string) : Q.Promise<any>
        getFile(repo : string, fileName : string) : Q.Promise<string>;
        setupWebhook(url:string, repo:string):Q.Promise<string>;
    }

    export class GitServiceMock implements GitService {

        private _failNextCall : boolean = false;
        private _mockFileContent : string = JSON.stringify({dependencies:[]});

        failNextCall() {
            this._failNextCall = true
        }

        authenticate(githubToken:String) { }

        setMockFileContentToBeReturned(content:string) : void {
            this._mockFileContent = content;
        }

        getFile(repo : string, fileName : string) : Q.Promise<string> {
            var d = Q.defer();

            if(this._failNextCall) {
                setTimeout(() => d.reject('{message:"file couldnt be retrieved", errors:[]}'), 1);
                this._failNextCall = false
            } else {
                process.nextTick(() => d.resolve(this._mockFileContent));
            }

            return d.promise;
        }

        user(id : string) : Q.Promise<any> {
            var d = Q.defer();

            if(this._failNextCall) {
                setTimeout(() => d.reject('{message:"user does not exist", errors:[]}'), 1);
                this._failNextCall = false
            } else {
                process.nextTick(() => d.resolve({id : id}));
            }

            return d.promise;
        }

        getRepo(name : string) : Q.Promise<any> {
            var d = Q.defer();

            if(this._failNextCall) {
                setTimeout(() => d.reject('{message:"repo cannot be resolved", errors:[]}'), 1);
                this._failNextCall = false
            } else {
                process.nextTick(() => d.resolve({name : name}));
            }

            return d.promise;
        }

        setupWebhook(url:string, repo:string):Q.Promise<string> {
            var d = Q.defer();

            if(this._failNextCall) {
                setTimeout(() => d.reject('{message:"could not setup hook id", errors:[]}'), 1);
                this._failNextCall = false
            } else {
                process.nextTick(() => d.resolve('hookId'));
            }

            return d.promise;
        }
    }

    export class GithubAPI implements GitService {

        private _service:any;

        constructor() {
            var GitHubApi:any = require("github");
            this._service = new GitHubApi({
                // required
                version: "3.0.0",
                // optional
                debug: false,
                protocol: "https",
                host: "api.github.com",
                timeout: 5000,
                headers: {
                    "user-agent": "lean-ci" // GitHub is happy with a unique user agent
                }
            });
        }

        authenticate(githubToken:String) {
            console.log('authenticating: ' + githubToken);
            this._service.authenticate({
                type: "oauth",
                token: githubToken
            });
        }

        getFile(repo:string, filePath:string):Q.Promise<string> {
            var d = Q.defer();

            let split = repo.split('/');

            let query = {
                user: split[0],
                repo: split[1],
                path: filePath
            };

            this._service.repos.getContent(query, (err, res) => {
                if (err) {
                    let errorMessage = "github 'getContent' request error: " + err;
                    console.error(errorMessage);
                    d.reject({message: errorMessage});
                } else {
                    console.info("github 'content; request result: " + JSON.stringify(res));

                    let url = res.download_url;

                    // TODO: download actual content of the file
                    d.resolve(url);
                }
            });
            return d.promise;
        }

        user(id : string) : Q.Promise<any> {
            var d = Q.defer();
            this._service.userId.get({'id' : id}, (err, res) => {
                if (err) {
                    let errorMessage = "github 'user' request error: " + err;
                    console.error(errorMessage);
                    d.reject({message: errorMessage});
                } else {
                    console.info("github 'user; request result: " + JSON.stringify(res));
                    d.resolve(res);
                }
            });
            return d.promise;
        }

        getRepo(name : string) : Q.Promise<any> {
            let repo = name.split('/')[1];
            let owner = name.split('/')[0];
            var d = Q.defer();
            this._service.repos.get({user : owner, repo : repo}, (err, res) => {
                if (err) {
                    let errorMessage = "github 'repos' request error: " + err;
                    console.error(errorMessage);
                    d.reject({message: errorMessage});
                } else {
                    console.info("github 'user; request result: " + JSON.stringify(res));
                    d.resolve(res);
                }
            });
            return d.promise;
        }

        setupWebhook(url:string, repo:string):Q.Promise<string> {
            var d = Q.defer();

            this.checkWebhookExists(url, repo)
                .then(hookId => d.resolve(hookId))
                .fail(() => this.createWebhook(url, repo)
                                .then(hookId => d.resolve(hookId))
                                .fail(message => d.reject(message))
                    );

            return d.promise;
        }

        private checkWebhookExists(url : string, repo : string):Q.Promise<string> {
            var d = Q.defer();
            this._service.repos.getHooks({
                user: repo.split('/')[0],
                repo: repo.split('/')[1],
            }, (err, res) => {
                if (err) {
                    let errorMessage = "github 'getHooks' request error: " + err;
                    console.log(errorMessage);
                    d.reject({message: errorMessage});
                } else {
                    console.info('github request result: ' + JSON.stringify(res));
                    let hookId;
                    for(var i = 0; i < res.length; i++) {
                        if(res[i].config.url === url) {
                            hookId = res[i].id;
                            break;
                        }
                    }
                    if(hookId != null) {
                        d.resolve(hookId);
                    } else {
                        d.reject({message: 'webhook for ' + url + ' not found'});
                    }
                }
            });
            return d.promise;
        }

        private createWebhook(url:string, repo:string):Q.Promise<string> {
            var d = Q.defer();

            this._service.repos.createHook({
                name: 'web',
                events: ['push'],
                user: repo.split('/')[0],
                repo: repo.split('/')[1],
                active: true,
                config: {
                    url: url,
                    content_type: 'json'
                }
            }, (err, res) => {
                if (err) {
                    let errorMessage = "github 'createHook' request error: " + err;
                    console.error(errorMessage);
                    d.reject({message: errorMessage});
                } else {
                    console.info('github request result: ' + JSON.stringify(res));
                    d.resolve(res.id);
                }
            });

            return d.promise;
        }
    }
}