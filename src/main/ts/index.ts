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

class App {

    private container : Container;

    init(db) {
        this.container = ContainerBuilder.create();

        this.container.add(new repository.MongoDBRepository<model.UserCredentials>('user_credentials', db), 'userCredentialsRepository');
        this.container.add(new repository.MongoDBRepository<model.BuildResult>('build_results', db), 'buildResultsRepository');
        this.container.add(new repository.MongoDBRepository<model.Repository>('repositories', db), 'repositoriesRepository');
        this.container.add(new repository.MongoDBRepository<model.ActiveBuild>('active_builds', db), 'activeBuildsRepository');
        this.container.add(new repository.MongoDBRepository<model.BuildRequest>('active_builds', db), 'queuedBuildsRepository');

        this.container.add(new terminal.TerminalAPI(config.terminal), 'terminalApi');
        this.container.add(new builder.TerminalBuildService(), 'buildService');
        this.container.add(new builder.BuildScheduler(), 'buildScheduler');
        this.container.add(new auth.AuthenticationService(), 'authenticationService');
        this.container.add(new api.LeanCIApi(), 'leanCIApi');
        this.container.add(new model.AllProjects(), 'allProjects');
        this.container.add(new model.BuildQueue(), 'buildQueue');
        this.container.add(new api.ExpressServer(), 'expressServer');
        this.container.add(new github.GithubAPI(), 'githubApi');

        this.container.add(new PersistedBuildQueue(), 'foo');

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
}

repository.mongodbConnect(config.mongodbUrl, (err, db) => {
    if(err) {
        throw new Error('couldnt establish mongodb connection: ' + err)
    } else {
        let app = new App();
        app.init(db);
    }
});
