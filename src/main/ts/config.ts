"use strict";

import * as fs from "fs"

let port = process.env.PORT ? process.env.PORT : 8091;

export var config = {

    appUrl : 'http://0.0.0.0:' + port,
    defaultPort : 8091,
    privateApiSecret : 'super-secret-token',

    mongodbUrl : '',

    github : {
        appClientId : '',
        appClientSecret : '',
        hookUrl : '',
    }
};
