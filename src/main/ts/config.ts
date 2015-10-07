///<reference path="../../../lib/node-0.10.d.ts"/>


import fs = require("fs");
//import process = require("process");

export var config;


var path = process.env.HOME + '/lean-ci-config.json';
var path2 = './lean-ci-config.json';
console.log('looking up config.json in ' + path);
console.log('looking up config.json in ' + path2);

if(config) {
    //config already set
} else if(process.env.LEANCI_CONFIG) {
    console.log('found LEANCI_CONFIG environment variable');
    let b = new Buffer(process.env.LEANCI_CONFIG, 'base64');
    config = JSON.parse(b.toString());
} else if(fs.existsSync(path)) {
    console.log(path + ' found');
    config = JSON.parse(fs.readFileSync(path, 'utf8'));
} else if(fs.existsSync(path2)) {
    console.log(path2 + ' found');
    config = JSON.parse(fs.readFileSync(path2, 'utf8'));
} else {

    console.log(path + ' not found, applying mock config');

    config = {

        // appUrl may or not include the port, in Heroku defaultPort is the internal port, and 80 is the external
        appUrl : 'http://0.0.0.0:8091',
        defaultPort : 8091,

        mongodbUrl : '',

        terminal: {
            userToken: '',
            accessToken: '',
            buildAgentId: '',
            port: 8092
        },

        github : {
            appClientId : '',
            appClientSecret : '',
            hookUrl : '',
        }
    };
}


if(process.env.PORT) {
    config.defaultPort = process.env.PORT;
    console.log('PORT environment variable applied to configuration: ' + config.defaultPort);
}

console.info('applied configuration: \n' + JSON.stringify(config));