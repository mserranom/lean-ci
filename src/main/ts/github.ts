///<reference path="promises.ts"/>

import {P} from './promises';

export module github {

    export class GithubAPI {

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

        user(id : string) : P.Promise<any> {
            var d = P.defer<any>();
            this._service.user.get({'id' : id}, (err, res) => {
                if (err) {
                    let errorMessage = "github 'user' request error: " + err;
                    console.error(errorMessage);
                    d.reject({message: errorMessage});
                } else {
                    console.info("github 'user; request result: " + JSON.stringify(res));
                    d.resolve(res);
                }
            });
            return d.promise();
        }

        setupWebhook(url:string, repo:string):P.Promise<string> {
            var d = P.defer<string>();

            this.checkWebhookExists(url, repo)
                .then(hookId => d.resolve(hookId))
                .fail(() => this.createWebhook(url, repo)
                                .then(hookId => d.resolve(hookId))
                                .fail(message => d.reject(message))
                    );

            return d.promise();
        }

        private checkWebhookExists(url : string, repo : string):P.Promise<string> {
            var d = P.defer<string>();
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
            return d.promise();
        }

        private createWebhook(url:string, repo:string):P.Promise<string> {
            var d = P.defer<string>();

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

            return d.promise();
        }
    }
}