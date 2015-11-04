import {config} from './config';
import {builder} from './builder';
import {model} from './model';
import {api} from './api';
import {repository} from './repository';
import {auth} from './auth';
import {github} from './github';
import {terminal} from './terminal';
import {PersistedBuildQueue} from './build/BuildQueue'
import {BuildSchedulerImpl} from './build/BuildScheduler'
import {Repositories} from './rest/Repositories'
import {Ping} from './rest/Ping'
import {BuildRequests} from './rest/BuildRequests'

import {Container, ContainerBuilder} from '../../../lib/container';

var fs = require('fs-extra');

export interface BootstrapArguments {
    local : boolean;
}

export class App {

    private container : Container;

    private arguments : BootstrapArguments;

    constructor(bootstrapArgs : BootstrapArguments) {
        this.arguments = bootstrapArgs;
    }

    init(db) {
        this.container = ContainerBuilder.create();

        if(this.arguments.local) {
            this.container.add(new builder.MockBuildService(), 'buildService');
        } else {
            this.container.add(new terminal.TerminalAPI(config.terminal), 'terminalApi');
            this.container.add(new builder.TerminalBuildService(), 'buildService');
        }

        this.setupRepositories(db);
        this.setupRestServices();

        if(this.arguments.local) {
            this.container.add(new auth.MockAuthenticationService(), 'authenticationService');
        } else {
            this.container.add(new auth.GithubAuthenticationService(), 'authenticationService');
        }

        this.container.add(new PersistedBuildQueue(), 'buildQueue');

        this.container.add(new BuildSchedulerImpl(), 'buildScheduler');

        this.container.add(new api.ExpressServer(), 'expressServer');

        if(this.arguments.local) {
            this.container.add(new github.GitServiceMock(), 'githubApi');
        } else {
            this.container.add(new github.GithubAPI(), 'githubApi');
        }

        this.container.init();
    }

    private setupRepositories(db) {
        this.container.add(new repository.MongoDBRepository<model.UserCredentials>('user_credentials', db), 'userCredentialsRepository');
        this.container.add(new repository.MongoDBRepository<model.BuildResult>('build_results', db), 'buildResultsRepository');
        this.container.add(new repository.MongoDBRepository<model.Repository>('repositories', db), 'repositoriesRepository');
        this.container.add(new repository.MongoDBRepository<model.ActiveBuild>('active_builds', db), 'activeBuildsRepository');
        this.container.add(new repository.MongoDBRepository<model.BuildRequest>('active_builds', db), 'queuedBuildsRepository');
    }

    private setupRestServices() {
        this.container.add(new api.LeanCIApi(), 'leanCIApi');
        this.container.add(new Repositories());
        this.container.add(new Ping());
        this.container.add(new BuildRequests());
    }

    stop() {
        let server : api.ExpressServer = this.container.get('expressServer');
        server.stop();
    }
}

let tingoDBLocation = 'dist/tingodb_data';

export function start(bootstrapArgs : BootstrapArguments) : App {
    let app = new App(bootstrapArgs);
    let onDBConnect = (err, db) => {
        if(err) {
            throw new Error('couldnt establish mongodb connection: ' + err)
        } else {
            app.init(db);
            return app;
        }
    };

    if(bootstrapArgs.local) {
        console.log('using local TingoDB connection for persistence');
        fs.mkdirsSync(tingoDBLocation);
        repository.tingodbConnect(tingoDBLocation, onDBConnect);
    } else {
        repository.mongodbConnect(config.mongodbUrl, onDBConnect);
    }

    return app;
}

export function cleanup() {
    fs.removeSync(tingoDBLocation);
}



