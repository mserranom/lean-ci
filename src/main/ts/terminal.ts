///<reference path="../../../lib/node-0.10.d.ts"/>
///<reference path="promises.ts"/>

import http = require("http");
import https = require("https")

import {P} from './promises';
export var defer = P.defer;
export var when = P.when;
export interface Promise<Value> extends P.Promise<Value> {}

export module terminal {


    export interface TerminalConfig {
        userToken : string;
        accessToken : string;
        buildAgentId : string;
    }

    export interface TerminalInfo {
        subdomain : string;
        container_ip : string;
        container_key : string;
    }

    export class TerminalAPI {

        private static POLL_INTERVAL_MS = 1000;
        private static CREATE_TERMINAL_TIMEOUT = 30000;

        private _config;
        private _sshKey;

        constructor(config:TerminalConfig, sshKey:string) {
            this._config = config;
            this._sshKey = sshKey;
        }

        createTerminal() : Promise<TerminalInfo> {

            console.info('creating new agent');

            let d = defer<TerminalInfo>();

            let options:TerminalRequestOptions = {
                query: 'start_snapshot',
                requireAuthentication: true,
                data: {
                    'snapshot_id': this._config.buildAgentId,
                    'publicKey': this._sshKey
                 }
            };

            let pollAttempts = TerminalAPI.CREATE_TERMINAL_TIMEOUT / TerminalAPI.POLL_INTERVAL_MS;
            let currentAttempt = 0;

            var pollRequest = requestId => {
                let requestOptions:TerminalRequestOptions = {
                    query: 'request_progress',
                    requireAuthentication: false,
                    data: {'request_id': requestId}
                };

                this.createTerminalRequest(requestOptions)
                    .fail(err => d.reject(err))
                    .then(function (requestStatus:any) {
                        if (requestStatus.status == 'success') {
                            console.log('new agent request succeeded');
                            d.resolve(requestStatus.result);
                        } else {
                            console.log('new agent request status: ' + requestStatus.status);
                            currentAttempt++;
                            if(currentAttempt > pollAttempts) {
                                let errorMessage = "new agent request timeout";
                                console.error(errorMessage);
                                d.reject({message: errorMessage});
                            } else {
                                setTimeout(() => pollRequest(requestId), TerminalAPI.POLL_INTERVAL_MS);
                            }
                        }
                    }
                )
            };

            this.createTerminalRequest(options)
                .fail(err => d.reject(err))
                .then(result => pollRequest(result['request_id']));

            return d.promise();
        }

        closeTerminal(agent : TerminalInfo) {
            let options:TerminalRequestOptions = {
                query: 'delete_terminal',
                requireAuthentication: true,
                data: {
                    'container_key': agent.container_key,
                }
            };

            this.createTerminalRequest(options).fail(error => console.error(error));
        }

        private createTerminalRequest(options:TerminalRequestOptions):Promise<Object> {

            let d = defer<Object>();

            let headers = {
                'Content-Type': 'application/json'
            };

            if (options.requireAuthentication) {
                headers['user-token'] = this._config.userToken;
                headers['access-token'] = this._config.accessToken;
            }

            let reqOptions = {
                host: 'www.terminal.com',
                path: '/api/v0.2/' + options.query,
                method: 'POST',
                headers: headers
            };

            console.info('creating terminal.com request: ' + JSON.stringify(options.query));

            var request = https.request(reqOptions, response => this.processResponse(response, d));

            request.on('error', function (e) {
                var errorMessage = 'error creating terminal.com "' + options.query + '" request: ' + e;
                console.error(errorMessage);
                d.reject({message: errorMessage});
            });

            if (options.data) {
                request.write(JSON.stringify(options.data));
            }
            request.end();

            return d.promise();
        }

        private processResponse(response:http.ClientResponse, d : P.Deferred<Object>) {
            response.setEncoding('utf-8');

            var responseString = '';

            response.on('data', function (data) {
                responseString += data;
            });

            response.on('end', function () {
                console.info('terminal.com response received: ' + JSON.stringify(responseString));

                let responseObject;
                try {
                    responseObject = JSON.parse(responseString);
                }
                catch (error){
                    let errorMessage = 'terminal.com reponse parser error: ' + error;
                    d.reject({message : errorMessage});
                    return;
                }

                if(responseObject.error)
                {
                    let errorMessage = 'terminal.com request error: ' + responseObject.error;
                    console.error(errorMessage);
                    d.reject({message : errorMessage});
                }
                else
                {
                    d.resolve(responseObject);
                }
            });
        }

    }

    interface TerminalRequestOptions {
        query : string;
        requireAuthentication : boolean;
        data : Object;
    }

}







