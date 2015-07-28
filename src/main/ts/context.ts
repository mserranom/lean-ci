import {config} from './config';
import {builder} from './builder';
import {model} from './model';
import {api} from './api';
import {repository} from './repository';
import {auth} from './auth';
import {github} from './github';


export module context {

    export class BaseContext {

        init(db : any) {
            this.credentialsRepository = new repository.MongoDBRepository<model.UserCredentials>('user_credentials', db);
            this.resultRepository = new repository.MongoDBRepository<model.BuildResult>('build_results', db);
            this.reposRepository = new repository.MongoDBRepository<model.Repository>('repositories', db);
            this.buildScheduler = new builder.BuildScheduler(this.projects, this.buildQueue,
                this.buildService, this.resultRepository);
            this.authService = new auth.AuthenticationService(this.credentialsRepository, this.github);
            this.restApi = new api.LeanCIApi(this.buildQueue, this.buildScheduler, this.resultRepository,
                this.reposRepository, this.authService, this.github);
        }

        projects : model.AllProjects = new model.AllProjects();
        buildQueue : model.BuildQueue = new model.BuildQueue();
        expressServer : api.ExpressServer = new api.ExpressServer();
        github : github.GithubAPI = new github.GithubAPI();

        // set on constructor
        authService : auth.AuthenticationService;
        credentialsRepository : repository.DocumentRepository<model.UserCredentials>;
        resultRepository : repository.DocumentRepository<model.BuildResult>;
        reposRepository : repository.DocumentRepository<model.Repository>;
        buildScheduler : builder.BuildScheduler;
        restApi : api.LeanCIApi;

        // set on children
        buildService : builder.BuildService;
    }

}