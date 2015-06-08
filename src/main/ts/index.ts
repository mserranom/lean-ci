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
var bodyParser : any = require('body-parser');
var multer : any = require('multer');

var app = express();
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(multer()); // for parsing multipart/form-data

var server = app.listen(64321, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log('http server listening at http://%s:%s', host, port);
});

app.post('/github/push', function (req, res) {
    console.log('received /github/push POST request');
    res.end();

    console.info(JSON.stringify(req.body)); // https://developer.github.com/v3/activity/events/types/#pushevent
    let repo = req.body.repository.full_name;
    builder.startBuild(repo);
});


