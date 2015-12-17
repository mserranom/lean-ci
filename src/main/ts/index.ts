"use strict";

import {start, BootstrapArguments} from './app'

import {Container, ContainerBuilder} from '../../../lib/container';

let args : BootstrapArguments = {
    local : process.argv.indexOf("-local") != -1
};

start(args);




