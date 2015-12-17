"use strict";

export module util {

    export function overrideConsoleColors() {
        var colors = require('colors/safe');

        var mapping = {
            info: colors.grey,
            log: colors.green,
            warn: colors.yellow,
            error: colors.red
        };

        ["info", "log", "warn", "error"].forEach(function(method) {
            var oldMethod = console[method].bind(console);
            console[method] = function() {

                let stringLog = arguments[0];
                stringLog = new Date().toISOString() + " " + stringLog;
                stringLog = mapping[method](stringLog);
                arguments[0] = stringLog;
                oldMethod.apply(console, arguments);
            };
        });
    }

}