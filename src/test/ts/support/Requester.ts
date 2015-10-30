///<reference path="../../../../lib/Q.d.ts"/>

var Q = require('q');

export function doGet(endpoint) : Q.Promise<any> {
    return request(endpoint, 'get', null);
}

export function doPost(endpoint, data) : Q.Promise<any> {
    return request(endpoint, 'post', data);
}

export function doDel(endpoint) : Q.Promise<any> {
    return request(endpoint, 'del', null);
}

function request(endpoint, method, data) : Q.Promise<any> {

    let defer : Q.Deferred<any> = Q.defer();

    var options = {
        url: 'http://localhost:8091' + endpoint,
        headers: {
            'x-lean-ci-user-id': 'aaaa',
            'x-lean-ci-user-token': 'aaaa',
            'x-lean-ci-github-token': 'aaaa'
        },
        formData: null
    };

    if (data) {
        options.formData = data;
    }

    var req = require('request');

    if (!method) {
        method = data ? 'post' : 'get';
    }

    req[method](options, function (error, response, body) {
        if (error) {
            defer.reject(error);
        } else if (response.statusCode != 200) {
            defer.reject('server status code: ' + response.statusCode);
        } else {
            defer.resolve(body);
        }
    });

    return defer.promise;
}