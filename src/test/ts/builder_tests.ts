///<reference path="../../../lib/node-0.10.d.ts"/>
///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>
///<reference path="../../../src/main/ts/builder.ts"/>
///<reference path="../../../src/main/ts/model.ts"/>
///<reference path="../../../src/main/ts/terminal.ts"/>
///<reference path="../../../src/main/ts/promises.ts"/>
///<reference path='../../../node_modules/immutable/dist/immutable.d.ts'/>

import {builder} from '../../../src/main/ts/builder';
import {model} from '../../../src/main/ts/model';
import {terminal} from '../../../src/main/ts/terminal';
import {P} from '../../../src/main/ts/promises';
import {expect} from 'chai';

import Immutable = require('immutable');

export var defer = P.defer;

var simple = require('simple-mock');

describe('BuildScheduler: ', () => {

    var project : model.Project;
    var upproject : model.Project;
    var downProject : model.Project;

    var terminalDefer = defer<terminal.TerminalInfo>();

    var data : model.AllProjects;
    var service : builder.BuildService;
    var terminalApi : terminal.TerminalAPI;
    var sut : builder.BuildScheduler;

    var terminalInfo = {subdomain : 'fooSubdomain', container_ip : 'foo', container_key : 'my_container_key'};

    var checkAndAcceptTerminalCreateRequest = function(times:number) {
        expect(terminalApi.createTerminalWithOpenPorts['callCount']).equals(times);
        terminalDefer.resolve(terminalInfo);
    };

    var assertTerminalWasNotRequested = function() {
        expect(terminalApi.createTerminalWithOpenPorts['callCount']).equals(0);
    };

    var assertBuildWasRequested = function(times:number) {
        expect(service.sendBuildRequest['callCount']).equals(times);
        expect(service.sendBuildRequest['lastCall'].args[0]).to.contain('fooSubdomain');
        expect(service.sendBuildRequest['lastCall'].args[1].repo).equals(project.repo);
    };

    var assertBuildWasNotRequested = function() {
        expect(service.sendBuildRequest['callCount']).equals(0);
    };

    var assertUpDownProjectDependenciesAreCorrect = function() {
        expect(upproject.downstreamDependencies.some(dep => dep.downstream == downProject)).to.be.true;
        expect(downProject.upstreamDependencies.some(dep => dep.upstream == upproject)).to.be.true;
    };

    beforeEach(function(){
        data = new model.AllProjects();
        data.addNewProject('myuser/myrepo');
        data.addNewProject('myuser/myrepoUp');
        data.addNewProject('myuser/myrepoDown');
        project = data.getProject('myuser/myrepo');
        upproject = data.getProject('myuser/myrepoUp');
        downProject = data.getProject('myuser/myrepoDown');
        expect(project).not.null;

        let serviceMock : any = {};
        service = serviceMock;
        service.sendBuildRequest = simple.spy(function () {});

        let terminalApiMock : any = {};
        terminalApi = terminalApiMock;
        terminalApi.createTerminalWithOpenPorts = simple.spy(ports => { return terminalDefer.promise();});
        terminalApi.closeTerminal = simple.spy(function () {});

        sut = new builder.BuildScheduler(data, new model.BuildQueue(), service, terminalApi);
    });

    it('startBuild() should request a build for a submitted project',() => {
        sut.queueBuild(project.repo);
        sut.startBuild();

        checkAndAcceptTerminalCreateRequest(1);
        assertBuildWasRequested(1);
    });

    it('startBuild() shouldnt request a build when there are no projects queued',() => {
        sut.startBuild();

        assertTerminalWasNotRequested();
        assertBuildWasNotRequested();
    });

    it('when a build is finished, a new one can be requested',() => {
        sut.queueBuild(project.repo);
        sut.queueBuild(project.repo);
        let req = sut.startBuild();

        let result = new model.BuildResult();
        result.request = {id : 'fakeId', repo : project.repo, commit : '', pingURL : 'url'};
        result.buildConfig = { command : 'mvn', dependencies : [] };
        sut.pingFinish(req.id, result);

        terminalDefer = defer<terminal.TerminalInfo>(); // clean up

        sut.startBuild();

        checkAndAcceptTerminalCreateRequest(2);
        assertBuildWasRequested(2);
    });

    it('when a build is finished and queue is empty, requesting builds has no effect',() => {
        sut.queueBuild(project.repo);
        let req = sut.startBuild();

        let result = new model.BuildResult();
        result.request = {id : 'fakeId', repo : project.repo, commit : '', pingURL : 'url'};
        result.buildConfig = { command : 'mvn', dependencies : [] };
        sut.pingFinish(req.id, result);

        terminalDefer = defer<terminal.TerminalInfo>(); // clean up

        expect(sut.startBuild()).to.be.null;

        checkAndAcceptTerminalCreateRequest(1);
        assertBuildWasRequested(1);
    });

    it('when a build is finished downstream dependencies are registered',() => {
        sut.queueBuild(downProject.repo);
        let req = sut.startBuild();

        let result = new model.BuildResult();
        result.request = {id : 'fakeId', repo : downProject.repo, commit : '', pingURL : 'url'};
        result.buildConfig = { command : 'mvn', dependencies : [upproject.repo] };
        sut.pingFinish(req.id, result);

        assertUpDownProjectDependenciesAreCorrect();
    });

    it('when a build is finished build agent is closed',() => {
        sut.queueBuild(downProject.repo);
        let req = sut.startBuild();

        let result = new model.BuildResult();
        result.request = {id : 'fakeId', repo : downProject.repo, commit : '', pingURL : 'url'};
        result.buildConfig = { command : 'mvn', dependencies : [upproject.repo] };
        sut.pingFinish(req.id, result);

        expect(terminalApi.closeTerminal['callCount']).equals(1);
        expect(terminalApi.closeTerminal['lastCall'].args[0]).equals(terminalInfo);
    });

    it('attempting to finish a build that doesnt exist throw an error',() => {
        sut.queueBuild(upproject.repo);
        sut.startBuild();

        let result = new model.BuildResult();
        result.request = {id : 'fakeId', repo : upproject.repo, commit : '', pingURL : 'url'};
        result.buildConfig = { command : 'mvn', dependencies : [downProject.repo] };

        let fn = () => sut.pingFinish('fakeId', result);
        expect(fn).to.throw(/fakeId/);
    });

    it('a downstream dependency build can be started after the upstream is finished',() => {
        data.setDependency(upproject.repo, downProject.repo);
        assertUpDownProjectDependenciesAreCorrect();

        sut.queueBuild(upproject.repo);
        let upstreamReq = sut.startBuild();
        expect(upstreamReq.repo).equals(upproject.repo);

        let result = new model.BuildResult();
        result.request = {id : 'fakeId', repo : upproject.repo, commit : '', pingURL : 'url'};
        result.buildConfig = { command : 'mvn', dependencies : [downProject.repo] };
        sut.pingFinish(upstreamReq.id, result);

        let downstreamReq = sut.startBuild();
        expect(downstreamReq.repo).equals(downProject.repo);
    });

});

