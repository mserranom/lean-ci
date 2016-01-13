"use strict";

require('source-map-support').install();

import {start, BootstrapArguments} from './app'

import {Container, ContainerBuilder} from 'container-ts';

let args : BootstrapArguments = {
    local : process.argv.indexOf("-local") != -1
};

start(args);




