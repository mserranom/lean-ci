"use strict";

const DEFAULT_PORT = 8091;

function getEnvConfig() : any {
    if(process.env.LEANCI_CONFIG) {
        let base64Config = new Buffer(process.env.LEANCI_CONFIG, 'base64');
        let config = JSON.parse(base64Config.toString());
        let port = process.env.PORT || DEFAULT_PORT;
        config.httpServerPort = port;
        return config;
    } else {
        return null;
    }

}

const defaultConfig = {

    appUrl : `http://0.0.0.0:${DEFAULT_PORT}`,
    httpServerPort : DEFAULT_PORT,
    privateApiSecret : 'super-secret-token',

    mongodbUrl : ''
};

export var config = getEnvConfig() || defaultConfig;
