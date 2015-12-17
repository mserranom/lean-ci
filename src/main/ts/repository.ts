///<reference path="../../../lib/Q.d.ts"/>

"use strict";

var Q = require('q');

import {model} from './model';
import {config} from './config';


export module repository {

    export function mongodbConnect(url:string, callback:(err,db) => void) {
        let mongodb = require("mongodb");
        let client = mongodb.MongoClient;
        client.connect(url, callback);
    }

    export function tingodbConnect(path:string, callback:(err,db) => void) {
        let engine : any = require('tingodb')();
        setTimeout(() => callback(null, new engine.Db(path, {})), 1);
    }

    export interface DocumentRepositoryQ<T> {
        removeAllQ() : Q.Promise<void>;
        removeQ(query : Object) : Q.Promise<void>;
        saveQ(data : T | Array<T>) : Q.Promise<Array<T>>;
        updateQ(query : Object, data : T) : Q.Promise<void>;
        fetchQ(query : any, page : number, perPage : number, cursorDecorator? : (any) => void) : Q.Promise<Array<T>>;
        fetchFirstQ(query : any, cursorDecorator? : (any) => void) : Q.Promise<T>;
    }

    export interface DocumentRepository<T> {
        removeAll(onError: (error) => void, onResult:() => void) : void;
        remove(query : Object, onError: (error) => void, onResult:() => void) : void;
        save(data : T | Array<T> , onError:(any) => void, onResult:(item : Array<T>) => void) : void;
        update(query : Object, data : T, onError:(any) => void, onResult:() => void) : void;
        fetch(query : any, page : number, perPage : number,
              onError:(any) => void, onResult:(data:Array<T>) => void, cursorDecorator? : (any) => void) : void;
        fetchFirst(query : any, onError:(any) => void, onResult:(T) => void, cursorDecorator? : (any) => void) : void
    }

    export class MongoDBRepository<T> implements DocumentRepository<T>, DocumentRepositoryQ<T> {

        private _collection : any;

        constructor(collectionName : string, db : any) {
            this._collection = db.collection(collectionName);
        }

        removeQ(query : Object) : Q.Promise<void> {
            let defer : Q.Deferred<void> = Q.defer();
            this.remove(query, (error) => defer.reject(error), () => defer.resolve());
            return defer.promise;
        }

        remove(query : Object, onError: (error) => void, onResult:() => void) : void {
            this._collection.remove(query, (err, numberOfRemovedDocs) => {
                if(err) {
                    onError(err);
                } else {
                    onResult();
                }
            });
        }

        removeAllQ() : Q.Promise<void> {
            let defer : Q.Deferred<void> = Q.defer();
            this.removeAll((error) => defer.reject(error), () => defer.resolve());
            return defer.promise;
        }

        removeAll(onError: (error) => void, onResult:() => void) : void {
            this.remove({}, onError, onResult)
        }

        saveQ(data : T | Array<T>) : Q.Promise<Array<T>> {
            let defer : Q.Deferred<Array<T>> = Q.defer();
            this.save(data, (error) => defer.reject(error), (data) => defer.resolve(data));
            return defer.promise;
        }

        save(data : T | Array<T> , onError:(any) => void, onResult:(insertedData : Array<T>) => void) : void {
            this._collection.insert(data, (err,res) => {
                if(err) {
                    onError(err);
                } else {
                    onResult(res);
                }
            });
        }

        updateQ(query : Object, data : T) : Q.Promise<void> {
            let defer : Q.Deferred<void> = Q.defer();
            this.update(query, data, (error) => defer.reject(error), () => defer.resolve());
            return defer.promise;
        }

        update(query : Object, data : T, onError:(any) => void, onResult:() => void) : void {
            // If upsert is true and no document matches the query criteria, update() inserts a single document.
            // If upsert is true and there are documents that match the query criteria, update() performs an update.

            this._collection.update(query, data, {upsert : true}, (err,res) => {
                if(err) {
                    onError(err);
                } else {
                    onResult();
                }
            });
        }

        fetchQ(query : any, page : number, perPage : number, cursorDecorator? : (any) => void) : Q.Promise<Array<T>> {
            let defer : Q.Deferred<Array<T>> = Q.defer();
            this.fetch(query, page, perPage, (error) => defer.reject(error), (result) => defer.resolve(result), cursorDecorator);
            return defer.promise;
        }

        fetch(query : any, page : number, perPage : number,
              onError:(any) => void, onResult:(data:Array<T>) => void, cursorDecorator? : (any) => void) : void {
            // scales badly perhaps http://blog.mongodirector.com/fast-paging-with-mongodb/
            // http://docs.mongodb.org/manual/reference/method/cursor.skip/
            let index = page - 1;
            index = Math.max(0, index);
            let cursor = this._collection.find(query)
                .skip(index * perPage).limit(perPage);
            if(cursorDecorator) {
                cursorDecorator(cursor);
            }
            this.requestFetch(cursor, onError, onResult);
        }

        fetchFirstQ(query : any, cursorDecorator? : (any) => void) : Q.Promise<T> {
            let defer : Q.Deferred<T> = Q.defer();
            this.fetchFirst(query, (error) => defer.reject(error), (result) => defer.resolve(result));
            return defer.promise;
        }

        fetchFirst(query:any, onError:(any)=>void, onResult:(T)=>void, cursorDecorator? : (any) => void):void {
            this.fetch(query, 1, 1, onError, (data:Array<T>) => {
                if(data.length > 0) {
                    onResult(data[0]);
                } else {
                    onResult(undefined);
                }
            }, cursorDecorator);
        }

        private requestFetch<T>(cursor : any, onError: (any) => void, onResult: (T) => void) {
            let result : Array<T> = [];
            cursor.each((error, doc) => {
                let cursorItem : T = doc;
                if(error) {
                    onError(error);
                } else if (cursorItem) {
                    result.push(cursorItem);
                } else {
                    onResult(result);
                }
            });
        }

    }
}
