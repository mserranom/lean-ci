///<reference path="util.ts"/>
///<reference path="config.ts"/>
///<reference path="github.ts"/>
///<reference path="builder.ts"/>
///<reference path="model.ts"/>
///<reference path="api.ts"/>
///<reference path="terminal.ts"/>

import {util} from './util';
import {config} from './config';
import {github} from './github';
import {builder} from './builder';
import {model} from './model';
import {api} from './api';
import {terminal} from './terminal';

util.overrideConsoleColors();


// create data model

var projects = new model.AllProjects();
projects.populateTestData();

var queue = new model.BuildQueue();



// setup hooks for github

var githubAPI = new github.GithubAPI(config.github.username, config.github.password);

function registerWebhook(repo : string) {
    githubAPI.setupWebhook(config.github.hookUrl, repo)
        .then(id => console.log('hook ' + id + ' available!'))
        .fail(error => console.warn('there was an issue: ' + error.message));
}

projects.getProjects().forEach(project => registerWebhook(project.repo));



// setup server

var express : any = require('express');
var bodyParser : any = require('body-parser');
var multer : any = require('multer');

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

var server = app.listen(config.defaultPort, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('http server listening at http://%s:%s', host, port);
});



// setup builder

var terminalApi = new terminal.TerminalAPI(config.terminal);
var scheduler = new builder.BuildScheduler(projects, queue, new builder.TerminalBuildService(terminalApi));
setInterval(() => scheduler.startBuild(), 1000);



// setup rest API

var restApi = new api.LeanCIApi(queue, scheduler);
restApi.start(app);








