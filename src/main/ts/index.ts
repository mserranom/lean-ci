import {start, BootstrapArguments} from './app'

import {Container, ContainerBuilder} from '../../../lib/container';

let args : BootstrapArguments = {
    local : process.argv.indexOf("-local") != -1,
    mockAgents : process.argv.indexOf("-mockAgents") != -1,
    mockAuth : process.argv.indexOf("-mockAuth") != -1
};

start(args);




