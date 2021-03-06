"use strict";

process.on('unhandledRejection', function(reason, p){
    console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging here
});

require('source-map-support').install();

import {start, BootstrapArguments} from './app'

let args : BootstrapArguments = {
    mockDB : process.argv.indexOf("-mock_db") != -1,
    mockGit : process.argv.indexOf("-mock_git") != -1
};

start(args);






