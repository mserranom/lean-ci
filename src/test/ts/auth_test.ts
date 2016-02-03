"use strict";

import {auth} from '../../../src/main/ts/auth';
import {repository} from '../../../src/main/ts/repository';
import {github} from '../../../src/main/ts/github';
import {model} from '../../../src/main/ts/model';

var Q = require('q');

var simple = require('simple-mock');
var expect = require('chai').expect;

describe('GithubAuthenticationService:', () => {

    let sut : auth.GithubAuthenticationService;

    let repoMock : repository.DocumentRepository<model.UserCredentialsSchema>;
    let githubMock : github.GitService;

    let createMock = function(methods : Array<string>) : any {
        let mock = {};
        methods.forEach(method => mock[method] = simple.spy(() => {}));
        return mock;
    };

    let testCredentials : model.UserCredentialsSchema = {userId : 'myUserId', token : 'myToken'};

    let successfulFirstFetchMock = (query, onError, onResult: (any) => void ) => onResult(testCredentials);
    let failedFirstFetchMock = (query, onError: (string) => void, onResult) => onError('failed');
    let firstFetchWithInvalidCredentialsMock = (query, onError, onResult: (any) => void ) => onResult(null);

    let successfulUpdateMock = (query, data, onError, onResult:() => void) => onResult();
    let failedUpdateMock = (query, data, onError:(any) => void, onResult) => onError('update failed');

    let githubUserPromise : any;

    beforeEach(() => {
        repoMock = createMock(['fetchFirst', 'update']);

        githubMock = createMock(['authenticate']);

        githubUserPromise = Q.defer();
        githubMock.user = simple.spy((id) => githubUserPromise.promise);


        sut = new auth.GithubAuthenticationService();
        sut.repo = repoMock;
        sut.gitServiceFactory = createMock([]);
        sut.gitServiceFactory.getService = () => githubMock;
    });

    afterEach(() => {
    });

    it('should fail immediately when no token or github-token are provided', (done) => {
        let checkError = (error) => {
            expect(error).equals('a token or github oauth token should be provided');
            expect(githubMock.authenticate['callCount']).equals(0);
            done();
        };
        sut.authenticate('boo','','',
            (error)=> checkError(error),
            () => {throw 'failed'});
    });

    it('should fail immediately when a token is provided but a username is not', (done) => {
        let checkError = (error) => {
            expect(error).equals('userid not provided for token=myToken');
            expect(githubMock.authenticate['callCount']).equals(0);
            done();
        };
        sut.authenticate('','myToken','myGithubToken',
            (error) => checkError(error),
            () => {throw 'failed'});
    });

    it('should fail immediately when credentials cannot be fetched', (done) => {

        simple.mock(repoMock, 'fetchFirst').callFn(failedFirstFetchMock);

        let checkGithubAuthNotRequested = () => {
            expect(githubMock.authenticate['callCount']).equals(0);
            done();
        };

        sut.authenticate(testCredentials.userId, testCredentials.token, '',
            (error) => checkGithubAuthNotRequested(),
            () => {throw 'should have failed'});
    });

    it('should succeed immediately when user/password is correct', (done) => {

        simple.mock(repoMock, 'fetchFirst').callFn(successfulFirstFetchMock);

        let checkResult = (credentials : model.UserCredentialsSchema) => {
            expect(credentials.userId).equals(testCredentials.userId);
            expect(credentials.token).equals(testCredentials.token);
            expect(githubMock.authenticate['callCount']).equals(0);
            done();
        };

        sut.authenticate(testCredentials.userId, testCredentials.token, '',
            (error) => {throw error},
            (credentials) => checkResult(credentials));
    });

    it('should check github authorisation calling "user" endpoint when user/password is not correct', (done) => {
        simple.mock(repoMock, 'fetchFirst').callFn(firstFetchWithInvalidCredentialsMock);

        let checkGithubWasRequested = () => {
            expect(githubMock.user['callCount']).equals(1);
            expect(githubMock.user['lastCall'].args[0]).equals(testCredentials.userId);
            done();
        };

        sut.authenticate(testCredentials.userId, '', 'myGithubToken',
            (error) => checkGithubWasRequested(),
            () => {throw 'should have failed'});

        //forcing a failure of the github authorisation
        githubUserPromise.reject('/user failed');

    });

    it('should fail when github authorisation is denied', (done) => {

        //invalid credentials will trigger github authorisation
        simple.mock(repoMock, 'fetchFirst').callFn(firstFetchWithInvalidCredentialsMock);

        sut.authenticate('', '', 'myGithubToken',
            (error) => done(),
            () => {throw 'should have failed'});

        //forcing a failure of the github authorisation
        githubUserPromise.reject('/user failed');
    });

    it('should update user and token in the repository when github is authorised', (done) => {

        simple.mock(repoMock, 'fetchFirst').callFn(firstFetchWithInvalidCredentialsMock);

        let checkUpdateWasCalled = () => {
            expect(repoMock.update['callCount']).equals(1);
            expect(repoMock.update['lastCall'].args[0]).not.to.be.null;
            done()
        };

        sut.authenticate('', '', 'myGithubToken', () => {}, () => {});
        githubUserPromise.resolve({});

        setTimeout( () => checkUpdateWasCalled() , 1 );

    });

    it('should fail when new credentials cannot be updated', (done) => {

        simple.mock(repoMock, 'fetchFirst').callFn(firstFetchWithInvalidCredentialsMock);
        simple.mock(repoMock, 'update').callFn(failedUpdateMock);

        sut.authenticate('', '', 'myGithubToken',
            (error) => done(),
            () => {throw 'should have failed'});

        githubUserPromise.resolve({});

    });

    it('should succeed when github is authorised', (done) => {

        simple.mock(repoMock, 'fetchFirst').callFn(firstFetchWithInvalidCredentialsMock);
        simple.mock(repoMock, 'update').callFn(successfulUpdateMock);

        sut.authenticate('', '', 'myGithubToken',
            (error) => {throw error},
            () => done());

        githubUserPromise.resolve({});
    });

});
