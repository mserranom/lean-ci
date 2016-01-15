"use strict";

require('source-map-support').install();

import {start, BootstrapArguments} from './app'

let args : BootstrapArguments = {
    local : process.argv.indexOf("-local") != -1
};

start(args);




