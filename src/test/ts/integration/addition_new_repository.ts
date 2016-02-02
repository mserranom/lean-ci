"use strict";

import {start, cleanup, App} from '../../../../src/main/ts/app';
import {model} from '../../../../src/main/ts/model';
import {github} from '../../../../src/main/ts/github';
import {doGet, doPost, doDel, USER_ID} from '../support/Requester';

import {setupChai} from '../test_utils'

var expect = require('chai').expect;
setupChai();

describe('addition of a new repository', () => {

    let testRepo = 'organisation/repo1';
    var app : App;

    beforeEach( (done) => {
        let args = {
            mockDB : true,
            mockGit : true
        };
        app = start(args);
        setTimeout(() => done(), 10);
    });

    afterEach( (done) => {
        app.stop();
        cleanup();
        setTimeout(() => done(), 10);
    });

    it('POST new repository should return the newly added repo',  async function(done) {
        await doPost('/repositories', {name : testRepo});

        let repositories : Array<model.RepositorySchema> = await doGet('/repositories');
        expect(repositories.length).equals(1);
        expect(repositories[0].name).equals(testRepo);
        expect(repositories[0].userId).equals(USER_ID);
        done();
    });

    it('GET single repository should return the repository just added',  async function(done) {
        await doPost('/repositories', {name : testRepo});

        let automaticallyGivenID = 2;
        let repository : model.RepositorySchema = await doGet('/repositories/' + automaticallyGivenID);

        expect(repository.name).equals(testRepo);
        expect(repository.userId).equals(USER_ID);
        done();
    });

    it('POST repository should fail when repo is not validated by git service',  (done) => {
        let gitService : github.GitServiceMock = app.getComponent('gitServiceFactory').getService();
        gitService.failNextCall();

        doPost('/repositories', {name : 'organisation/nonExistingRepo'})
            .should.eventually.be.rejectedWith('server status code: 500')
            .and.notify(done);
    });

    it('POST a new repository with no dependencies should create a new dependency graph',  async function(done) {
        await doPost('/repositories', {name : testRepo});

        let graphs : Array<model.DependencyGraphSchema> = await doGet('/dependency_graphs');
        expect(graphs.length).equals(1);

        let graph = graphs[0];
        expect(graph.repos.length).equals(1);
        expect(graph.repos[0]).equals(testRepo);
        expect(graph.dependencies.length).equals(0);

        done();
    });

    it('POST a new repository with dependencies on a non-existing repo should create a new dependency graph including the dependency',  async function(done) {
        let gitService : github.GitServiceMock = app.getComponent('gitServiceFactory').getService();
        gitService.setMockFileContentToBeReturned(JSON.stringify({dependencies : ['organisation/other_repo']}));

        await doPost('/repositories', {name : testRepo});

        let graphs : Array<model.DependencyGraphSchema> = await doGet('/dependency_graphs');
        expect(graphs.length).equals(1);

        let graph = graphs[0];
        expect(graph.repos.length).equals(1);
        expect(graph.repos[0]).equals(testRepo);
        expect(graph.dependencies.length).equals(1);
        expect(graph.dependencies[0]).deep.equal({up : 'organisation/other_repo', down : testRepo });

        done();
    });
});



