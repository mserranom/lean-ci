///<reference path="terminal.ts"/>
///<reference path="util.ts"/>
///<reference path="config.ts"/>
///<reference path="ssh.ts"/>

import {terminal} from './terminal';
import {util} from './util';
import {config} from './config';
import {ssh} from './ssh';


util.overrideConsoleColors();

var terminalAPI = new terminal.TerminalAPI(config.terminal, config.sshPubKey);


var commands = [
    "git clone https://github.com/mserranom/lean-ci.git",
    "cd lean-ci",
    "git clean -xfd",
    "npm install --unsafe-perm"];

terminalAPI.createTerminal()
    .then(terminal =>
            {
                console.log('key: ' + terminal.container_key);
                var agentURL = terminal.subdomain + ".terminal.com";
                ssh.execute(agentURL, commands).then(() => terminalAPI.closeTerminal(terminal));
            })
    .fail(error => console.error("error creating terminal:  " + error.message));