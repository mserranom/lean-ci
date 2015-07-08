///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>


import {terminal} from './terminal';
import {util} from './util';
import {config} from './config';
import {model} from './model';
import {repository} from './repository'

import Immutable = require('immutable');

export module builder {

    export interface BuildService {
        request(nextRequest : model.BuildRequest, onError : (any) => void);
        terminateAgent(buildId : string);
    }

    export class TerminalBuildService implements BuildService{

        private _terminalAPI : terminal.TerminalAPI;

        private _agents : Immutable.Map<string, terminal.TerminalInfo> = Immutable.Map<string, terminal.TerminalInfo>();

        constructor(terminalAPI : terminal.TerminalAPI) {
            this._terminalAPI = terminalAPI;
        }

        request(nextRequest : model.BuildRequest, onError : (any) => void) {

            console.log('starting build on repo: ' + nextRequest.repo);

            this._terminalAPI.createTerminalWithOpenPorts([config.terminal.port])
                .then(terminal => {
                    console.log('key: ' + terminal.container_key);
                    this._agents = this._agents.set(nextRequest.id, terminal);
                    let agentURL = 'http://' + terminal.subdomain + "-" + config.terminal.port + '.terminal.com/start';
                    this.sendBuildRequest(agentURL, nextRequest);
                })
                .fail(error => onError(error));

            return nextRequest;
        }

        private sendBuildRequest(agentURL:string, req:model.BuildRequest) {
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

        terminateAgent(buildId : string) {
            this._terminalAPI.closeTerminal(this._agents.get(buildId));
            this._agents = this._agents.remove(buildId);
        }
    }

    export class MockBuildService implements BuildService {

        request(req:model.BuildRequest, onError:(any)=>void) {
            var request : any = require('request');

            let result : model.BuildResult = {
                request : req,
                succeeded : true,
                buildConfig : {command : '', dependencies : []},
                log : '',
                startedTimestamp : new Date(),
                finishedTimestamp : new Date(),
            };

            let pingResult = function() {
                console.log('mock agent pingFinish to,' + req.pingURL + ' id=' + req.id);
                request.post({
                    headers: {
                        'content-type' : 'application/json'},
                    'url': req.pingURL + '?id=' + req.id,
                    'body': JSON.stringify(result)
                });
            };

            setTimeout(pingResult, 3000 + Math.random() * 10000);
        }

        terminateAgent(buildId:string) {
        }

    }

    export class BuildScheduler {

        private _data : model.AllProjects;
        private _queue : model.BuildQueue;
        private _buildService : BuildService;
        private _repository : repository.DocumentRepository<model.BuildResult>;

        private _activeBuilds : Immutable.Map<string, model.BuildRequest> = Immutable.Map<string, model.BuildRequest>();

        constructor(data : model.AllProjects, queue : model.BuildQueue,
                    service : BuildService, repository : repository.DocumentRepository<model.BuildResult>) {
            this._data = data;
            this._queue = queue;
            this._buildService = service;
            this._repository = repository;
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
                    user : 'user',
                    repo : repo,
                    commit : commit,
                    pingURL : pingURL,
                    requestTimestamp : new Date(),
                    processedTimestamp : null
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

            this._buildService.request(nextRequest, req => this._queue.finish(req));

            nextRequest.processedTimestamp = new Date();

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

            this._repository.save(result, (err) => console.error(err), () => {});

            this._buildService.terminateAgent(buildId);
        }

        private queueDownstreamDependencies(project:model.Project) {
            if(project.downstreamDependencies.size > 0) {
                project.downstreamDependencies.forEach(dep => this.queueBuild(dep.downstream.repo));
            }
        }


    }

}