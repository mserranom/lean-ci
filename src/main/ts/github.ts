"use strict";

export module github {

    export interface GitService {
        authenticate(token:String);
        user(id : string) : Promise<any>;
        getRepo(name : string) : Promise<any>
        getFile(repo : string, fileName : string) : Promise<string>;
        setupWebhook(url:string, repo:string):Promise<string>;
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

        getFile(repo : string, fileName : string) : Promise<string> {
            return new Promise((resolve, reject) => {
                if(this._failNextCall) {
                    setTimeout(() => reject('{message:"file couldnt be retrieved", errors:[]}'), 1);
                    this._failNextCall = false
                } else {
                    process.nextTick(() => resolve(this._mockFileContent));
                }
            });
        }

        user(id : string) : Promise<any> {
            return new Promise((resolve, reject) => {
                if(this._failNextCall) {
                    setTimeout(() => reject('{message:"user does not exist", errors:[]}'), 1);
                    this._failNextCall = false
                } else {
                    process.nextTick(() => resolve({id : id}));
                }
            });
        }

        getRepo(name : string) : Promise<any> {
            return new Promise((resolve, reject) => {
                if(this._failNextCall) {
                    setTimeout(() => reject('{message:"repo cannot be resolved", errors:[]}'), 1);
                    this._failNextCall = false
                } else {
                    process.nextTick(() => resolve({name : name}));
                }
            });
        }

        setupWebhook(url:string, repo:string):Promise<string> {
            return new Promise((resolve, reject) => {
                if(this._failNextCall) {
                    setTimeout(() => reject('{message:"could not setup hook id", errors:[]}'), 1);
                    this._failNextCall = false
                } else {
                    process.nextTick(() => resolve('hookId'));
                }
            });
        }
    }

    export class GithubAPI implements GitService {

        private _service:any;

        constructor() {
            var Api : any = require("github");
            this._service = new Api({
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

        getFile(repo:string, filePath:string):Promise<string> {

            return new Promise((resolve, reject) => {
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
                        reject({message: errorMessage});
                    } else {
                        console.info("github 'content; request result: " + JSON.stringify(res));

                        let base64Config = new Buffer(res.content, 'base64');
                        let config = base64Config.toString();
                        console.info('retrieved leanci.json: ' + config);
                        resolve(config);
                    }
                });
            });
        }

        user(id : string) : Promise<any> {
            return new Promise((resolve, reject) => {
                this._service.user.get({'id' : id}, (err, res) => {
                    if (err) {
                        let errorMessage = "github 'user' request error: " + err;
                        console.error(errorMessage);
                        reject({message: errorMessage});
                    } else {
                        console.info("github 'user; request result: " + JSON.stringify(res));
                        resolve(res);
                    }
                });
            });
        }

        getRepo(name : string) : Promise<any> {
            return new Promise((resolve, reject) => {
                let repo = name.split('/')[1];
                let owner = name.split('/')[0];
                this._service.repos.get({user: owner, repo: repo}, (err, res) => {
                    if (err) {
                        let errorMessage = "github 'repos' request error: " + err;
                        console.error(errorMessage);
                        reject({message: errorMessage});
                    } else {
                        console.info("github 'user' request result: " + JSON.stringify(res));
                        resolve(res);
                    }
                });
            });
        }

        setupWebhook(url:string, repo:string):Promise<string> {
            return new Promise((resolve, reject) => {
                this.checkWebhookExists(url, repo)
                    .then(hookId => resolve(hookId))
                    .catch(() => this.createWebhook(url, repo)
                        .then(hookId => resolve(hookId))
                        .catch(message => reject(message))
                    );
            });
        }

        private checkWebhookExists(url : string, repo : string):Promise<string> {
            return new Promise((resolve, reject) => {
                this._service.repos.getHooks({
                    user: repo.split('/')[0],
                    repo: repo.split('/')[1],
                }, (err, res) => {
                    if (err) {
                        let errorMessage = "github 'getHooks' request error: " + err;
                        console.log(errorMessage);
                        reject({message: errorMessage});
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
                            resolve(hookId);
                        } else {
                            reject({message: 'webhook for ' + url + ' not found'});
                        }
                    }
                });
            });
        }

        private createWebhook(url:string, repo:string):Promise<string> {
            return new Promise((resolve, reject) => {
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
                        reject({message: errorMessage});
                    } else {
                        console.info('github request result: ' + JSON.stringify(res));
                        resolve(res.id);
                    }
                });
            });
        }
    }
}
