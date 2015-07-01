import {util} from '../../../../src/main/ts/util';
import {config} from '../../../../src/main/ts/config';
import {github} from '../../../../src/main/ts/github';
import {builder} from '../../../../src/main/ts/builder';
import {terminal} from '../../../../src/main/ts/terminal';
import {repository} from '../../../../src/main/ts/repository';
import {context} from '../../../../src/main/ts/context';

util.overrideConsoleColors();

class MockAppContext extends context.BaseContext{

    buildService = new builder.MockBuildService();
}

export function start(onReady : (MockAppContext) => void) {
    repository.tingodbConnect('./', (err, db) => {
        if(err) {
            throw new Error('couldnt establish tingodb connection: ' + err)
        } else {
            let context = new MockAppContext();
            context.init(db);

            context.projects.populateTestData();

            context.restApi.setup(context.expressServer.start());

            setInterval(() => context.buildScheduler.startBuild(), 1000);

            onReady(context);
        }
    });
}

export function stop(ctx : MockAppContext) {
    ctx.expressServer.stop();
}

let args : Array<string> = process.argv;
if(args.some(arg => {return arg == 'start'})) {
    console.log('starting app');
    start(ctx => console.log('app startup complete'));
}


