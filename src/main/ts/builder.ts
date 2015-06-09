///<reference path="terminal.ts"/>
///<reference path="ssh.ts"/>
///<reference path="config.ts"/>
///<reference path="model.ts"/>

import {terminal} from './terminal';
import {util} from './util';
import {config} from './config';
import {ssh} from './ssh';
import {model} from './model';

export module builder {

    var data = new model.AllProjects();
    data.populateTestData();

    var terminalAPI = new terminal.TerminalAPI(config.terminal, config.sshPubKey);

    var buildQueue = new model.BuildQueue();

    export function queueBuild(repo : string) {
        let project = data.getProject(repo);
        if(!project) {
            console.error('unknown project: ' + repo);
        } else {
            console.log('adding project to build queue: ' + project.repo);
            buildQueue.add(data.getProject(repo));
        }
    }

    export function startBuild() {

        let repo = buildQueue.next();
        if(!repo) {
            return;
        }

        var commands = [
            "git clone https://github.com/",
            "cd ",
            "git clean -xfd",
            "npm install --unsafe-perm"];

        console.log('starting build on repo: ' + repo.repo);
        commands[0] = commands[0] + repo.repo + '.git';
        commands[1] = commands[1] + repo.repo.split('/')[1];

        terminalAPI.createTerminal()
            .then(terminal => {
                console.log('key: ' + terminal.container_key);
                var agentURL = terminal.subdomain + ".terminal.com";
                ssh.execute(agentURL, commands)
                    .then(() => {
                        terminalAPI.closeTerminal(terminal);
                        buildQueue.finish(repo)
                    })
                    .fail(error => {
                        console.log("error creating terminal:  " + error.message);
                        buildQueue.finish(repo);
                    } );
            })
            .fail(error => buildQueue.finish(repo));
    }

}