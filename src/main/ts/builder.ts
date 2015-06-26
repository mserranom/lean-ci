///<reference path="terminal.ts"/>
///<reference path="config.ts"/>
///<reference path="model.ts"/>
///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>


import {terminal} from './terminal';
import {util} from './util';
import {config} from './config';
import {model} from './model';

import Immutable = require('immutable');

export module builder {

    export class BuildService {

        sendBuildRequest(agentURL:string, req:model.BuildRequest) {
            console.log('sending build request to ' + agentURL + ", data: " + JSON.stringify(req));
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

        private _activeBuilds : Immutable.Map<string, model.BuildRequest> = Immutable.Map<string, model.BuildRequest>();
        private _agents : Immutable.Map<string, terminal.TerminalInfo> = Immutable.Map<string, terminal.TerminalInfo>();

        constructor(data : model.AllProjects, queue : model.BuildQueue,
                    service : BuildService, terminalAPI : terminal.TerminalAPI) {
            this._data = data;
            this._queue = queue;
            this._buildService = service;
            this._terminalAPI = terminalAPI;
        }

        queueBuild(repo : string, commit?:string) : model.BuildRequest {
            if(!commit) {
                commit = '';
            }
            let project = this._data.getProject(repo);
            if(!project) {
                throw new Error('unknown project: ' + repo);
            } else {
                console.log('adding project to build queue: ' + project.repo);

                let pingURL = config.appUrl + '/build/pingFinish';

                let request : model.BuildRequest = {
                    id : new Date().getTime() + "-" + Math.floor(Math.random() * 10000000000),
                    repo : repo,
                    commit : commit,
                    pingURL : pingURL,
                };

                this._queue.add(request);

                return request;
            }
        }

        startBuild() : model.BuildRequest {

            let nextRequest = this._queue.next();
            if(!nextRequest) {
                return null;
            }
            console.log('starting build on repo: ' + nextRequest.repo);

            this._activeBuilds = this._activeBuilds.set(nextRequest.id, nextRequest);

            this._terminalAPI.createTerminalWithOpenPorts([config.defaultPort])
                .then(terminal => {
                    console.log('key: ' + terminal.container_key);
                    this._agents = this._agents.set(nextRequest.id, terminal);
                    let agentURL = 'http://' + terminal.subdomain + "-" + config.defaultPort + '.terminal.com/start';
                    this._buildService.sendBuildRequest(agentURL, nextRequest);
                })
                .fail(error => this._queue.finish(nextRequest));

            return nextRequest;
        }

        pingFinish(result : model.BuildResult) {

            let buildId = result.request.id;
            let build = this._activeBuilds.get(result.request.id);

            if(!build) {
                throw new Error('unable to find active build with id=' + buildId);
            }

            let project = this._data.getProject(result.request.repo);
            this._data.updateDependencies(project.repo, result.buildConfig.dependencies);

            this._queue.finish(build);

            this._activeBuilds = this._activeBuilds.delete(buildId);

            if(result.succeeded) {
                this.queueDownstreamDependencies(project);
            }

            this.terminateAgent(buildId);
        }

        private queueDownstreamDependencies(project:model.Project) {
            if(project.downstreamDependencies.size > 0) {
                project.downstreamDependencies.forEach(dep => this.queueBuild(dep.downstream.repo));
            }
        }

        private terminateAgent(buildId : string) {
            this._terminalAPI.closeTerminal(this._agents.get(buildId));
            this._agents = this._agents.remove(buildId);
        }

    }

}