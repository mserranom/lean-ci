///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>
///<reference path="../../../lib/Q.d.ts"/>

var Q = require('q');


import {terminal} from './terminal';
import {util} from './util';
import {config} from './config';
import {model} from './model';
import {repository} from './repository'

import Immutable = require('immutable');

import {Inject} from '../../../lib/container';

export module builder {

    export interface BuildService {
        request(nextRequest : model.BuildRequest, onError : (any) => void)  : Q.Promise<model.ActiveBuild>;
        getStatus(scheduledBuild : model.ActiveBuild) : Q.Promise<string>;
        terminateAgent(buildId : string);
    }

    export class TerminalBuildService implements BuildService{

        @Inject('terminalApi')
         _terminalAPI : terminal.TerminalAPI;

        private _agents : Immutable.Map<string, terminal.TerminalInfo> = Immutable.Map<string, terminal.TerminalInfo>();

        request(nextRequest : model.BuildRequest, onError : (any) => void) : Q.Promise<model.ActiveBuild> {

            let defer : Q.Deferred<model.ActiveBuild> = Q.defer();

            console.log('starting build on repo: ' + nextRequest.repo);

            this._terminalAPI.createTerminalWithOpenPorts([config.terminal.port])
                .then(terminal => {
                    console.log('key: ' + terminal.container_key);
                    this._agents = this._agents.set(nextRequest.id, terminal);

                    let agentUrl = 'http://' + terminal.subdomain + "-" + config.terminal.port + '.terminal.com';
                    let startUrl = agentUrl + '/start';
                    this.sendBuildRequest(startUrl, nextRequest);

                    defer.resolve({
                        agentURL : agentUrl,
                        buildRequest : nextRequest
                    });
                })
                .fail(error => {
                    onError(error);
                    defer.reject(error);
                });

            return defer.promise;
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

        getStatus(scheduledBuild : model.ActiveBuild) : Q.Promise<string> {
            let defer : Q.Deferred<string> = Q.defer();

            var request : any = require('request');

            request.get(scheduledBuild.agentURL , (error, response, body) => {
                if (!error && response.statusCode == 200) {
                    defer.resolve(body);
                } else if (error){
                    defer.reject('unable to request build status: ' + error);
                } else {
                    defer.reject('unable to request build status: ' + response.statusCode);
                }
            });

            return defer.promise;
        }


        terminateAgent(buildId : string) {
            let agent = this._agents.get(buildId);
            if(!agent) {
                console.warn('agent for buildId=' + buildId + 'not found, cannot be terminated');
            } else {
                this._terminalAPI.closeTerminal(agent);
                this._agents = this._agents.remove(buildId);
            }
        }
    }

    export class MockBuildService implements BuildService {

        request(req:model.BuildRequest, onError:(any)=>void) : Q.Promise<model.ActiveBuild> {

            let defer : Q.Deferred<model.ActiveBuild> = Q.defer();

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

                defer.resolve({
                    agentURL : 'http://localhost:64321',
                    buildRequest : req
                });
            };

            setTimeout(pingResult, 3000 + Math.random() * 10000);

            return defer.promise;
        }

        getStatus(scheduledBuild : model.ActiveBuild) : Q.Promise<string> {
            let defer : Q.Deferred<string> = Q.defer();
            setImmediate(() => {defer.resolve('status: mock')}, 10);
            return defer.promise;
        }

        terminateAgent(buildId:string) {
        }

    }

    export class BuildScheduler {

        @Inject('allProjects')
        data : model.AllProjects;

        @Inject('buildQueue')
        queue : model.BuildQueue;

        @Inject('buildService')
        buildService : BuildService;

        @Inject('buildResultsRepository')
        buildResultsRepository : repository.DocumentRepository<model.BuildResult>;

        @Inject('activeBuildsRepository')
        activeBuildsRepository : repository.DocumentRepository<model.ActiveBuild>;

        private _activeBuilds : Immutable.Map<string, model.BuildRequest> = Immutable.Map<string, model.BuildRequest>();

        queueBuild(repo : string, commit?:string) : model.BuildRequest {
            if(!commit) {
                commit = '';
            }
            let project = this.data.getProject(repo);
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

                this.queue.add(request);

                return request;
            }
        }

        startBuild() : model.BuildRequest {

            let nextRequest = this.queue.next();
            if(!nextRequest) {
                return null;
            }
            console.log('starting build on repo: ' + nextRequest.repo);

            this._activeBuilds = this._activeBuilds.set(nextRequest.id, nextRequest);

            let onBuildError = (error : any) => this.onStartBuildError(error, nextRequest);

            this.buildService.request(nextRequest, onBuildError);

            nextRequest.processedTimestamp = new Date();

            return nextRequest;
        }

        startBuild2() : model.BuildRequest {

            let nextRequest = this.queue.next();
            if(!nextRequest) {
                return null;
            }
            console.log('starting build on repo: ' + nextRequest.repo);

            this._activeBuilds = this._activeBuilds.set(nextRequest.id, nextRequest);

            let onBuildError = (error : any) => this.onStartBuildError(error, nextRequest);

            this.buildService.request(nextRequest, onBuildError)
                .then((activeBuildInfo : model.ActiveBuild) =>
                    this.activeBuildsRepository.save(activeBuildInfo, (err) => console.error(err), () => {}))
                .fail((reason) => console.error(reason));

            nextRequest.processedTimestamp = new Date();

            return nextRequest;
        }

        private onStartBuildError(error : any, buildRequest : model.BuildRequest) : void {
            console.error('build request ' + buildRequest.id + ' failed for ' + buildRequest.repo);
            this.pingFinish({
                request : buildRequest,
                succeeded : false,
                buildConfig : null,
                log : error.message,
                startedTimestamp : new Date(),
                finishedTimestamp : new Date()
            });
        }

        pingFinish(result : model.BuildResult) {

            let buildId = result.request.id;
            let build = this._activeBuilds.get(result.request.id);

            if(!build) {
                throw new Error('unable to find active build with id=' + buildId);
            }

            let project = this.data.getProject(result.request.repo);
            if(result.buildConfig && result.buildConfig.dependencies) {
                this.data.updateDependencies(project.repo, result.buildConfig.dependencies);
            }

            this.queue.finish(build);

            this._activeBuilds = this._activeBuilds.delete(buildId);

            if(result.succeeded) {
                this.queueDownstreamDependencies(project);
            }

            this.buildResultsRepository.save(result, (err) => console.error(err), () => {});

            this.buildService.terminateAgent(buildId);
        }

        //pingFinish2(result : model.BuildResult) {
        //
        //    let buildId = result.request.id;
        //
        //    let onFetchActiveBuildError = (error) => {
        //        console.error('unable to find active build with id=' + buildId);
        //    };
        //
        //    let onActiveBuildFetched = (activeBuild:model.ActiveBuild) => {
        //
        //        this.repository.save(result, (err) => console.error(err), () => {
        //        });
        //        this.buildService.terminateAgent(buildId);
        //    };
        //}

        private queueDownstreamDependencies(project:model.Project) {
            if(project.downstreamDependencies.size > 0) {
                project.downstreamDependencies.forEach(dep => this.queueBuild(dep.downstream.repo));
            }
        }


    }

}
