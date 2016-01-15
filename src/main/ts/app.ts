"use strict";

import {config} from './config';
import {model} from './model';
import {api} from './api';
import {repository} from './repository';
import {auth} from './auth';
import {github} from './github';
import {PersistedBuildQueue} from './controllers/BuildController'
import {Repositories} from './rest/Repositories'
import {Ping} from './rest/Ping'
import {Builds} from './rest/Builds'
import {BuildRequests} from './rest/BuildRequests'
import {DependencyGraphs} from './rest/DependencyGraphs'
import {Pipelines} from './rest/Pipelines'
import {BuildRequestController} from './controllers/BuildRequestController'
import {PipelineController} from './controllers/PipelineController'

import {Container, ContainerBuilder} from 'container-ts';

var fs = require('fs-extra');

const TINGODB_LOCATION = 'dist/tingodb_data';

export interface BootstrapArguments {
    local : boolean;
}

export class App {

    private container : Container;

    private args : BootstrapArguments;

    constructor(bootstrapArgs : BootstrapArguments) {
        this.args = bootstrapArgs;
    }

    init(db) {
        this.container = ContainerBuilder.create();

        this.setupRepositories(db);
        this.setupRestServices();

        if(this.args.local) {
            this.container.add(new auth.MockAuthenticationService(), 'authenticationService');
        } else {
            this.container.add(new auth.GithubAuthenticationService(), 'authenticationService');
        }

        this.container.add(new PersistedBuildQueue(), 'buildQueue');

        this.container.add(new BuildRequestController(), 'buildRequestController');

        this.container.add(new PipelineController(), 'pipelineController');

        this.container.add(new api.ExpressServer(), 'expressServer');

        if(this.args.local) {
            this.container.add(new github.GitServiceMock(), 'githubApi');
        } else {
            this.container.add(new github.GithubAPI(), 'githubApi');
        }

        this.container.init();
    }

    private setupRepositories(db) {
        this.container.add(new repository.MongoDBRepository<model.UserCredentialsSchema>('user_credentials', db), 'userCredentialsRepository');
        this.container.add(new repository.MongoDBRepository<model.RepositorySchema>('repositories', db), 'repositoriesRepository');
        this.container.add(new repository.MongoDBRepository<model.BuildSchema>('builds', db), 'queuedBuildsRepository');
        this.container.add(new repository.MongoDBRepository<model.DependencyGraphSchema>('dependency_graphs', db), 'dependencyGraphsRepository');
        this.container.add(new repository.MongoDBRepository<model.PipelineSchema>('pipelines', db), 'pipelinesRepository');
    }

    private setupRestServices() {
        this.container.add(new api.ExpressServer(), 'expressServer');

        this.container.add(new Repositories(), 'rest.Repositories');
        this.container.add(new Ping(), 'rest.Ping');
        this.container.add(new Builds(), 'rest.Builds');
        this.container.add(new DependencyGraphs(), 'rest.DependencyGraphs');
        this.container.add(new Pipelines(), 'rest.Pipelines');
        this.container.add(new BuildRequests(), 'rest.BuildRequests');
    }

    getComponent(id : string) : any {
        return this.container.get(id);
    }

    stop() {
        let server : api.ExpressServer = this.container.get('expressServer');
        server.stop();
    }
}

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
        fs.mkdirsSync(TINGODB_LOCATION);
        repository.tingodbConnect(TINGODB_LOCATION, onDBConnect);
    } else {
        repository.mongodbConnect(config.mongodbUrl, onDBConnect);
    }

    return app;
}

export function cleanup() {
    fs.removeSync(TINGODB_LOCATION);
}



