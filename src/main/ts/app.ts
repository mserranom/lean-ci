import {config} from './config';
import {builder} from './builder';
import {model} from './model';
import {api} from './api';
import {repository} from './repository';
import {auth} from './auth';
import {github} from './github';
import {terminal} from './terminal';
import {PersistedBuildQueue} from './build/BuildQueue'

import {Container, ContainerBuilder} from '../../../lib/container';

var fs = require('fs-extra');

export interface BootstrapArguments {
    local : boolean;
    mockAgents : boolean;
    mockAuth : boolean;
}

export class App {

    private container : Container;

    private arguments : BootstrapArguments;

    constructor(bootstrapArgs : BootstrapArguments) {
        this.arguments = bootstrapArgs;
    }

    init(db) {
        this.container = ContainerBuilder.create();

        this.container.add(new repository.MongoDBRepository<model.UserCredentials>('user_credentials', db), 'userCredentialsRepository');
        this.container.add(new repository.MongoDBRepository<model.BuildResult>('build_results', db), 'buildResultsRepository');
        this.container.add(new repository.MongoDBRepository<model.Repository>('repositories', db), 'repositoriesRepository');
        this.container.add(new repository.MongoDBRepository<model.ActiveBuild>('active_builds', db), 'activeBuildsRepository');
        this.container.add(new repository.MongoDBRepository<model.BuildRequest>('active_builds', db), 'queuedBuildsRepository');

        if(this.arguments.mockAgents) {
            this.container.add(new builder.MockBuildService(), 'buildService');
        } else {
            this.container.add(new terminal.TerminalAPI(config.terminal), 'terminalApi');
            this.container.add(new builder.TerminalBuildService(), 'buildService');
        }

        this.container.add(new builder.BuildScheduler(), 'buildScheduler');

        if(this.arguments.mockAuth) {
            this.container.add(new auth.MockAuthenticationService(), 'authenticationService');
        } else {
            this.container.add(new auth.GithubAuthenticationService(), 'authenticationService');
        }

        this.container.add(new api.LeanCIApi(), 'leanCIApi');
        this.container.add(new model.AllProjects(), 'allProjects');

        this.container.add(new model.BuildQueue(), 'buildQueue');
        this.container.add(new PersistedBuildQueue(), 'buildQueue2');

        this.container.add(new api.ExpressServer(), 'expressServer');

        if(this.arguments.local) {
            this.container.add(new github.GitServiceMock(), 'githubApi');
        } else {
            this.container.add(new github.GithubAPI(), 'githubApi');
        }

        this.container.init();

        this.startApp();
    }

    private startApp() {
        let projects : model.AllProjects = this.container.get('allProjects');
        let restApi : api.LeanCIApi = this.container.get('leanCIApi');
        let expressServer : api.ExpressServer = this.container.get('expressServer');
        let buildScheduler : builder.BuildScheduler = this.container.get('buildScheduler');

        projects.populateTestData();
        restApi.setup(expressServer.start());

        setInterval(() => buildScheduler.startBuild(), 1000);
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



