///<reference path="terminal.ts"/>
///<reference path="ssh.ts"/>
///<reference path="config.ts"/>
///<reference path="model.ts"/>
///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>


import {terminal} from './terminal';
import {util} from './util';
import {config} from './config';
import {ssh} from './ssh';
import {model} from './model';

import Immutable = require('immutable');

export module builder {

    interface BuildRequest {
        id : string,
        repo : string;
        commit : string;
        pingURL : string;
    }

    export interface BuildConfig {
        command : string;
        dependencies : Array<string>;
    }

    export class BuildResult {
        repo : string;
        commit : string;
        succeeded : boolean;
        buildConfig : BuildConfig;
        log : string = '';
    }

    export class BuildService {

        sendBuildRequest(agentURL:string, req:BuildRequest) {
            var request : any = require('request');
            let args = {
                headers: {
                    'content-type' : 'application/json'},
                'url': agentURL,
                'body': JSON.stringify(req)
            };

            request.post(args , (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    console.log('build requested to ' + agentURL);
                } else if (error){
                    console.error('unable to request build: ' + error);
                } else {
                    console.error('error requesting build with HTTP status: ' + response.statusCode);
                }
            });
        }
    }

    export class BuildScheduler {

        private _data : model.AllProjects;
        private _queue : model.BuildQueue;
        private _buildService : BuildService;
        private _terminalAPI : terminal.TerminalAPI;

        private _activeBuilds : Immutable.Map<string, BuildRequest> = Immutable.Map<string, BuildRequest>();

        constructor(data : model.AllProjects, queue : model.BuildQueue,
                    service : BuildService, terminalAPI : terminal.TerminalAPI) {
            this._data = data;
            this._queue = queue;
            this._buildService = service;
            this._terminalAPI = terminalAPI;
        }

        queueBuild(repo : string) {
            let project = this._data.getProject(repo);
            if(!project) {
                console.error('unknown project: ' + repo);
            } else {
                console.log('adding project to build queue: ' + project.repo);
                this._queue.add(this._data.getProject(repo));
                if(project.downstreamDependencies.size > 0) {
                    project.downstreamDependencies.forEach(dep => this.queueBuild(dep.downstream.repo));
                }
            }
        }

        startBuild() : BuildRequest {

            let repo = this._queue.next();
            if(!repo) {
                return null;
            }

            let pingURL = 'http://mserranom145-64321.terminal.com/build/pingFinish';

            console.log('starting build on repo: ' + repo.repo);

            let req : BuildRequest = {
                id : new Date().getTime() + "-" + Math.floor(Math.random() * 10000000000),
                repo : repo.repo,
                commit : '',
                pingURL : pingURL,
            };

            this._activeBuilds = this._activeBuilds.set(req.id, req);

            this._terminalAPI.createTerminalWithOpenPorts([65234])
                .then(terminal => {
                    console.log('key: ' + terminal.container_key);
                    let agentURL = "http://" + terminal.subdomain + "-64321.terminal.com:";

                    this._buildService.sendBuildRequest(agentURL, req);

                })
                .fail(error => this._queue.finish(repo));

            return req;
        }

        pingFinish(buildId : string, result : BuildResult) {

            let build = this._activeBuilds.get(buildId);

            if(!build) {
                throw new Error('unable to find active build with id=' + buildId);
            }

            let project = this._data.getProject(result.repo);
            this._data.updateDependencies(project.repo, result.buildConfig.dependencies);
            this._activeBuilds = this._activeBuilds.delete(buildId);
            this._queue.finish(project);
        }

    }

}