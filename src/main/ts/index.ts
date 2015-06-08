///<reference path="util.ts"/>
///<reference path="config.ts"/>
///<reference path="github.ts"/>
///<reference path="builder.ts"/>

import {util} from './util';
import {config} from './config';
import {github} from './github';
import {builder} from './builder';

util.overrideConsoleColors();

var githubAPI = new github.GithubAPI(config.github.username, config.github.password);

function registerWebhook(repo : string) {
    githubAPI.setupWebhook(config.github.hookUrl, repo)
        .then(id => console.log('hook ' + id + ' available!'))
        .fail(error => console.warn('there was an issue: ' + error.message));
}

var repos = ['mserranom/lean-ci'];
repos.forEach(repo => registerWebhook(repo));

var express : any = require('express');
var app = express();
var server = app.listen(64321, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('http server listening at http://%s:%s', host, port);
});

app.post('/github/push', function (req, res) {
    console.log('received /github/push POST request');
    console.log(JSON.stringify(req);
    var repo = ''; //TODO
    builder.startBuild(repo);
});


