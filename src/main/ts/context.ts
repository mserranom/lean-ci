import {config} from './config';
import {builder} from './builder';
import {model} from './model';
import {api} from './api';
import {repository} from './repository';

export module context {

    export class BaseContext {

    init(db : any) {
        this.resultRepository = new repository.MongoDBRepository<model.BuildResult>('build_results', db);
        this.buildScheduler = new builder.BuildScheduler(this.projects, this.buildQueue,
            this.buildService, this.resultRepository);
        this.restApi = new api.LeanCIApi(this.buildQueue, this.buildScheduler, this.resultRepository);
    }

    projects : model.AllProjects = new model.AllProjects();
    buildQueue : model.BuildQueue = new model.BuildQueue();
    expressServer : api.ExpressServer = new api.ExpressServer();

    // set on constructor
    resultRepository : repository.MongoDBRepository<model.BuildResult>;
    buildScheduler : builder.BuildScheduler;
    restApi : api.LeanCIApi;

    // set on children
    buildService : builder.BuildService;
}

}