///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>

import {auth} from '../../../src/main/ts/auth';
import {repository} from '../../../src/main/ts/repository';
import {github} from '../../../src/main/ts/github';
import {model} from '../../../src/main/ts/model';
import {P} from '../../../src/main/ts/promises';

import {expect} from 'chai';

var simple = require('simple-mock');


describe('GithubAuthenticationService', () => {

    let sut : auth.GithubAuthenticationService;

    let repoMock : repository.DocumentRepository<model.UserCredentials>;
    let githubMock : github.GithubAPI;

    let createMock = function(methods : Array<string>) : any {
        let mock = {};
        methods.forEach(method => mock[method] = simple.spy(() => {}));
        return mock;
    };

    let testCredentials : model.UserCredentials = {userId : 'myUserId', token : 'myToken'};

    let successfulFirstFetchMock = (query, onError, onResult: (any) => void ) => onResult(testCredentials);
    let failedFirstFetchMock = (query, onError: (string) => void, onResult) => onError('failed');
    let firstFetchWithInvalidCredentialsMock = (query, onError, onResult: (any) => void ) => onResult(null);

    let successfulUpdateMock = (query, data, onError, onResult:() => void) => onResult();
    let failedUpdateMock = (query, data, onError:(any) => void, onResult) => onError('update failed');

    let githubUserPromise : any;

    beforeEach(() => {
        repoMock = createMock(['fetchFirst', 'update']);
        githubMock = createMock(['authenticate']);

        githubUserPromise = P.defer();
        githubMock.user = (id) => githubUserPromise.promise();

        sut = new auth.GithubAuthenticationService();
        sut.repo = repoMock;
        sut.github = githubMock;
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

        let checkResult = (credentials : model.UserCredentials) => {
            expect(credentials.userId).equals(testCredentials.userId);
            expect(credentials.token).equals(testCredentials.token);
            expect(githubMock.authenticate['callCount']).equals(0);
            done();
        };

        sut.authenticate(testCredentials.userId, testCredentials.token, '',
            (error) => {throw error},
            (credentials) => checkResult(credentials));
    });

    it('should request github authorisation when user/password is not correct', (done) => {
        simple.mock(repoMock, 'fetchFirst').callFn(firstFetchWithInvalidCredentialsMock);

        let checkGithubWasRequested = () => {
            expect(githubMock.authenticate['callCount']).equals(1);
            expect(githubMock.authenticate['lastCall'].args[0]).equals('myGithubToken');
            done();
        };

        sut.authenticate('', '', 'myGithubToken',
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
