"use strict";

import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {github} from '../../../../src/main/ts/github';
import {doGet, doPost, doDel, USER_ID} from '../support/Requester';

import {setupChai} from '../test_utils'

setupChai();
var expect = require('chai').expect;

describe('addition two repositories', () => {

    let testRepo1 = 'organisation/repo1';
    let testRepo2 = 'organisation/repo2';
    let dependency : model.Dependency = {up : testRepo1, down : testRepo2};

    let addRepositories = async function() {
        await doPost('/repositories', {name : testRepo1});
        await doPost('/repositories', {name : testRepo2});
    };

    var app : App;

    beforeEach( (done) => {
        let args = {
            local : true,
            mockAgents : true,
            mockAuth : true
        };
        app = start(args);
        setTimeout(() => done(), 10);
    });

    afterEach( (done) => {
        app.stop();
        cleanup();
        setTimeout(() => done(), 10);
    });

    it('adding 2 repos with the same name results in only storing the first',  async function(done) {
        await doPost('/repositories', {name : testRepo1});
        await doPost('/repositories', {name : testRepo1});

        let repositories : Array<model.RepositorySchema> = await doGet('/repositories?page=1&per_page=12');
        expect(repositories.length).equals(1);
        expect(repositories[0].name).equals(testRepo1);
        done();
    });

    it('GET paged repositories returns the repositories',  async function(done) {
        await addRepositories();

        let repositories : Array<model.RepositorySchema> = await doGet('/repositories?page=1&per_page=12');
        expect(repositories.length).equals(2);
        expect(repositories[0].name).equals(testRepo1);
        expect(repositories[1].name).equals(testRepo2);
        done();
    });

    it('should exist a dependency graph containing both repositories',  async function(done) {
        await addRepositories();
        let graphs : Array<model.DependencyGraphSchema> = await doGet('/dependency_graphs');
        expect(graphs.length).equals(1);
        expect(graphs[0].dependencies.length).equals(0);
        expect(graphs[0].repos.length).equals(2);
        expect(graphs[0].repos[0]).equals(testRepo1);
        expect(graphs[0].repos[1]).equals(testRepo2);
        done();
    });

    it('when a 2nd repo with a dependency is added, dependency graph should include that dependency',  async function(done) {

        await doPost('/repositories', {name : testRepo1});

        let gitService : github.GitServiceMock = app.getComponent('githubApi');
        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : [testRepo1]}));

        await doPost('/repositories', {name : testRepo2});

        let graphs : Array<model.DependencyGraphSchema> = await doGet('/dependency_graphs');
        expect(graphs.length).equals(1);
        expect(graphs[0].repos.length).equals(2);
        expect(graphs[0].repos[0]).equals(testRepo1);
        expect(graphs[0].repos[1]).equals(testRepo2);

        expect(graphs[0].dependencies).deep.equal([dependency]);
        done();
    });

    it('a repo is added with a dependency in a non-registered repo. When the 2nd repo is registered, the dependency should be defined',  async function(done) {

        let gitService : github.GitServiceMock = app.getComponent('githubApi');

        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : [testRepo1]}));
        await doPost('/repositories', {name : testRepo2});

        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : []}));
        await doPost('/repositories', {name : testRepo1});


        await doPost('/repositories', {name : testRepo2});

        let graphs : Array<model.DependencyGraphSchema> = await doGet('/dependency_graphs');
        expect(graphs.length).equals(1);
        expect(graphs[0].repos.length).equals(2);
        expect(graphs[0].repos[0]).equals(testRepo2);
        expect(graphs[0].repos[1]).equals(testRepo1);

        expect(graphs[0].dependencies).deep.equal([dependency]);
        done();
    });


});



