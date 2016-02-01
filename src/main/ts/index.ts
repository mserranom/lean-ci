"use strict";

require('source-map-support').install();

import {start, BootstrapArguments} from './app'

let args : BootstrapArguments = {
    mockDB : process.argv.indexOf("-mock_db") != -1,
    mockGit : process.argv.indexOf("-mock_git") != -1
};

start(args);




