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

    var terminalAPI = new terminal.TerminalAPI(config.terminal, config.sshPubKey);

    var buildQueue = new model.BuildQueue();

    export function queueBuild(repo : model.ScheduledBuild) {
        buildQueue.add(repo);
    }

    export function startBuild() {

        let repo = buildQueue.next();
        if(!repo) {
            return;
        }

        var commands = [
            "git clone https://github.com/",
            "cd lean-ci",
            "git clean -xfd",
            "npm install --unsafe-perm"];

        console.log('starting build on repo: ' + repo.repo);
        commands[0] = commands[0] + repo.repo + '.git';

        terminalAPI.createTerminal()
            .then(terminal =>
            {
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
            });
    }

}