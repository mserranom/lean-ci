import {config} from './config'
import {repository} from './repository'
import {model} from './model'
import {github} from './github'

export module auth {

    export class AuthenticationService {

        private _repo : repository.DocumentRepository<model.UserCredentials>;
        private _github : github.GithubAPI;

        constructor(repo : repository.DocumentRepository<model.UserCredentials>, github : github.GithubAPI) {
            this._repo = repo;
            this._github = github;
        }

        authenticate(userId:string, userToken : string, githubToken : string,
                     onError:(string) => void,
                     onResult:(data:model.UserCredentials) => void) : void {

            if(!userToken && !githubToken) {
                onError('a token or github oauth token should be provided');
                return;
            }

            if(userToken && !userId) {
                onError('userid not provided for token=' + userToken);
                return;
            }

            let service = new Authenticator(this._repo, this._github);
            service.authenticate(userId, userToken, githubToken, onError, onResult);
        }
    }

    class Authenticator {

        private _repo : repository.DocumentRepository<model.UserCredentials>;
        private _github : github.GithubAPI;

        private _userId : string;
        private _userToken : string;
        private _githubToken : string;
        private _onAuthError : (string) => void;
        private _onAuthSuccess : (data : model.UserCredentials) => void;

        private _newCredentials : model.UserCredentials;

        constructor(repo : repository.DocumentRepository<model.UserCredentials>, github : github.GithubAPI) {
            this._repo = repo;
            this._github = github;
        }

        authenticate(userId:string, userToken : string, githubToken : string,
             onError:(string) => void,
             onResult:(data:model.UserCredentials) => void) : void {

            this._userId = userId;
            this._userToken = userToken;
            this._githubToken = githubToken;
            this._onAuthError = onError;
            this._onAuthSuccess = onResult;

            this.startAuth();
        }

        private startAuth() {
            console.info(`authorising: {${this._userId}, ${this._userToken}, ${this._githubToken}}`);
            this.fetchUserCredentials();
        }

        private fetchUserCredentials() {
            let onError = (error) => this._onAuthError('error fetching credentials from repository: ' + error);
            let onSuccess = (credentials) => this.checkCredentials(credentials);
            this._repo.fetchFirst({'userId' : this._userId}, onError, onSuccess);
        }

        private checkCredentials(credentials : model.UserCredentials) {
            console.info('retrieved credentials: ' + JSON.stringify(credentials));
            if(credentials && this._userId == credentials.userId && this._userToken == credentials.token) {
                console.info('valid credentials');
                this._onAuthSuccess(credentials);
            } else {
                console.info('invalid credentials credentials');
                this.reauthorise();
            }
        }

        private reauthorise() {
            console.log('checking user authentication in github');
            let onError = (error) => this._onAuthError('unable to reauthenticate user in github');
            let onSuccess = (userData) => this.onGithubCredentialsSuccess(userData);

            this._github.authenticate(this._githubToken);
            this._github.user(this._userId).then(onSuccess).fail(onError);
        }

        private onGithubCredentialsSuccess(userData : any) {
            console.log('github authentication success');
            this._userId = userData.login;
            this.createNewCredentials()
        }

        private createNewCredentials() : void {
           this._newCredentials = {
               userId : this._userId,
               token : new Date().getTime() + '-' + Math.floor(Math.random() * 100000000000)
           };

            this._repo.save(this._newCredentials,
                (message) => this.onCredentialsSaveFailed(message),
                () => this.onCredentialsSavedSuccess());
        }

        private onCredentialsSaveFailed(message:any) {
            let log = 'failed to store user credentials: ' + message;
            console.error(log);
            this._onAuthError(log);
        }

        private onCredentialsSavedSuccess() {
            this._onAuthSuccess(this._newCredentials);
        }

        // TODO : dispose variables
    }
}