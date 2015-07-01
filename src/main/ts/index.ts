import {util} from './util';
import {config} from './config';
import {github} from './github';
import {builder} from './builder';
import {terminal} from './terminal';
import {repository} from './repository';
import {context} from './context';

util.overrideConsoleColors();

class AppContext extends context.BaseContext{

    githubAPI : github.GithubAPI = new github.GithubAPI(config.github.username, config.github.password);
    terminalApi : terminal.TerminalAPI = new terminal.TerminalAPI(config.terminal);
    buildService = new builder.TerminalBuildService(this.terminalApi);
}

function startApp(context : AppContext) {

    context.projects.populateTestData();

    // setup hooks for github
    context.projects.getProjects().forEach(project => context.githubAPI.setupWebhook(config.github.hookUrl, project.repo));

    context.restApi.setup(context.expressServer.start());

    setInterval(() => context.buildScheduler.startBuild(), 1000);
}

repository.mongodbConnect(config.mongodbUrl, (err, db) => {
    if(err) {
        throw new Error('couldnt establish mongodb connection: ' + err)
    } else {
        let ctx = new AppContext();
        ctx.init(db);
        startApp(ctx);
    }
});


