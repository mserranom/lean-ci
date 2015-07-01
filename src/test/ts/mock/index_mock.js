var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var util_1 = require('../../../../src/main/ts/util');
var builder_1 = require('../../../../src/main/ts/builder');
var repository_1 = require('../../../../src/main/ts/repository');
var context_1 = require('../../../../src/main/ts/context');
util_1.util.overrideConsoleColors();
var MockAppContext = (function (_super) {
    __extends(MockAppContext, _super);
    function MockAppContext() {
        _super.apply(this, arguments);
        this.buildService = new builder_1.builder.MockBuildService();
    }
    return MockAppContext;
})(context_1.context.BaseContext);
function start(onReady) {
    repository_1.repository.tingodbConnect('./', function (err, db) {
        if (err) {
            throw new Error('couldnt establish tingodb connection: ' + err);
        }
        else {
            var context_2 = new MockAppContext();
            context_2.init(db);
            context_2.projects.populateTestData();
            context_2.restApi.setup(context_2.expressServer.start());
            setInterval(function () { return context_2.buildScheduler.startBuild(); }, 1000);
            onReady(context_2);
        }
    });
}
exports.start = start;
function stop(ctx) {
    ctx.expressServer.stop();
}
exports.stop = stop;
var args = process.argv;
if (args.some(function (arg) { return arg == 'start'; })) {
    console.log('starting app');
    start(function (ctx) { return console.log('app startup complete'); });
}
