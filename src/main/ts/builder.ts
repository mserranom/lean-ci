///<reference path="terminal.ts"/>
///<reference path="ssh.ts"/>
///<reference path="config.ts"/>

import {terminal} from './terminal';
import {util} from './util';
import {config} from './config';
import {ssh} from './ssh';

export module builder {

    var terminalAPI = new terminal.TerminalAPI(config.terminal, config.sshPubKey);

    var commands = [
        "git clone https://github.com/",
        "cd lean-ci",
        "git clean -xfd",
        "npm install --unsafe-perm"];


    export function startBuild(repo : String) {

        console.log('starting build on repo: ' + repo);
        commands[0] = commands[0] + repo + '.git';

        terminalAPI.createTerminal()
            .then(terminal =>
            {
                console.log('key: ' + terminal.container_key);
                var agentURL = terminal.subdomain + ".terminal.com";
                ssh.execute(agentURL, commands)
                    .then(() => terminalAPI.closeTerminal(terminal))
                    .fail(error => console.log("error creating terminal:  " + error.message));
            });
    }

}