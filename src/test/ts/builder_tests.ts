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

class BuildResultImpl implements model.BuildResult {
    request:model.BuildRequest;
    succeeded:boolean;
    buildConfig:model.BuildConfig;
    log:string = '';
    
}

describe('BuildScheduler: ', () => {

    var project : model.Project;
    var upproject : model.Project;
    var downProject : model.Project;

    var data : model.AllProjects;
    var service : builder.BuildService;
    var sut : builder.BuildScheduler;

    var assertBuildWasRequested = function(times:number) {
        expect(service.request['callCount']).equals(times);
        expect(service.request['lastCall'].args[0].repo).equals(project.repo);
    };

    var assertBuildWasNotRequested = function() {
        expect(service.request['callCount']).equals(0);
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
        service.request = simple.spy(function () {});
        service.terminateAgent = simple.spy(function () {});

        sut = new builder.BuildScheduler(data, new model.BuildQueue(), service);
    });

    it('startBuild() should request a build for a submitted project',() => {
        sut.queueBuild(project.repo);
        sut.startBuild();

        assertBuildWasRequested(1);
    });

    it('startBuild() shouldnt request a build when there are no projects queued',() => {
        sut.startBuild();
        assertBuildWasNotRequested();
    });

    it('when a build is finished, a new one can be requested',() => {
        sut.queueBuild(project.repo);
        sut.queueBuild(project.repo);
        let req = sut.startBuild();

        let result : model.BuildResult = new BuildResultImpl();
        result.request = req;
        result.buildConfig = { command : 'mvn', dependencies : [] };
        sut.pingFinish(result);

        sut.startBuild();

        assertBuildWasRequested(2);
    });

    it('when a build is finished and queue is empty, requesting builds has no effect',() => {
        sut.queueBuild(project.repo);
        let req = sut.startBuild();

        let result : model.BuildResult = new BuildResultImpl();
        result.request = req;
        result.buildConfig = { command : 'mvn', dependencies : [] };
        sut.pingFinish(result);

        expect(sut.startBuild()).to.be.null;

        assertBuildWasRequested(1);
    });

    it('when a build is finished downstream dependencies are registered',() => {
        sut.queueBuild(downProject.repo);
        let req = sut.startBuild();

        let result : model.BuildResult = new BuildResultImpl();
        result.request = req;
        result.buildConfig = { command : 'mvn', dependencies : [upproject.repo] };
        sut.pingFinish(result);

        assertUpDownProjectDependenciesAreCorrect();
    });

    it('when a build is finished build agent is terminated',() => {
        sut.queueBuild(downProject.repo);
        let req = sut.startBuild();

        let result : model.BuildResult = new BuildResultImpl();
        result.request = req;
        result.buildConfig = { command : 'mvn', dependencies : [upproject.repo] };
        sut.pingFinish(result);

        expect(service.terminateAgent['callCount']).equals(1);
        expect(service.terminateAgent['lastCall'].args[0]).equals(req.id);
    });

    it('attempting to finish a build that doesnt exist throw an error',() => {
        sut.queueBuild(upproject.repo);
        let req = sut.startBuild();

        let result : model.BuildResult = new BuildResultImpl();
        result.request = req;
        result.request.id = 'nonExistentId';
        result.buildConfig = { command : 'mvn', dependencies : [downProject.repo] };

        let fn = () => sut.pingFinish(result);
        expect(fn).to.throw(/nonExistentId/);
    });

    it('a downstream dependency build can be started after the upstream is finished and succeeded',() => {
        data.setDependency(upproject.repo, downProject.repo);
        assertUpDownProjectDependenciesAreCorrect();

        sut.queueBuild(upproject.repo);
        let upstreamReq = sut.startBuild();
        expect(upstreamReq.repo).equals(upproject.repo);

        let result : model.BuildResult = new BuildResultImpl();
        result.succeeded = true;
        result.request = upstreamReq;
        result.buildConfig = { command : 'mvn', dependencies : [downProject.repo] };
        sut.pingFinish(result);

        let downstreamReq = sut.startBuild();
        expect(downstreamReq).not.null;
        expect(downstreamReq.repo).equals(downProject.repo);
    });

    it('a downstream dependency build shouldnt started after the upstream is finished when the upstream failed',() => {
        data.setDependency(upproject.repo, downProject.repo);
        assertUpDownProjectDependenciesAreCorrect();

        sut.queueBuild(upproject.repo);
        let upstreamReq = sut.startBuild();
        expect(upstreamReq.repo).equals(upproject.repo);

        let result : model.BuildResult = new BuildResultImpl();
        result.succeeded = false;
        result.request = upstreamReq;
        result.buildConfig = { command : 'mvn', dependencies : [downProject.repo] };
        sut.pingFinish(result);

        let downstreamReq = sut.startBuild();
        expect(downstreamReq).to.be.null;
    });

});