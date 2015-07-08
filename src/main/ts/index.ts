import {util} from './util';
import {config} from './config';
import {github} from './github';
import {builder} from './builder';
import {terminal} from './terminal';
import {repository} from './repository';
import {context} from './context';

require('newrelic');

util.overrideConsoleColors();

class AppContext extends context.BaseContext{

    terminalApi : terminal.TerminalAPI = new terminal.TerminalAPI(config.terminal);
    buildService = new builder.TerminalBuildService(this.terminalApi);
}

function startApp(context : AppContext) {

    context.projects.populateTestData();

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


