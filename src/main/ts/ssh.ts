///<reference path="terminal.ts"/>
///<reference path="promises.ts"/>


import {terminal} from './terminal';
import {P} from './promises';

var shell = require('shelljs');

export module ssh {

    export function execute(host : string, commands : string[]) : P.Promise<string> {

        var d = P.defer<string>();

        let finishString = 'FINISHED_1235918273651972365';
        let commandList = commands.join(';') + ';echo ' + finishString;

        var command = "ssh -q -oStrictHostKeyChecking=no " + host + " '" + commandList + "'";

        console.info(command);

        var proc = shell.exec(command, {silent: true, async: true});
        proc.stdout.on('data', function (data) {

            if (data.indexOf(finishString) != -1) {
                let msg = 'ssh execution complete';
                console.log(msg);
                d.resolve(msg)
            } else {
                console.info('ssh.stdout -- ' + data);
            }

        });
        proc.stderr.on('data', function (data) {
            console.warn('ssh.stderr -- ' + data);
        });

        return d.promise();
    }

}