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

    export interface CursorFilter {
        sort(value:any);
    }

    export interface DocumentRepository<T> {
        removeAll(onError: (error) => void, onResult:() => void) : void;
        save(data : T | Array<T> , onError:(any) => void, onResult:() => void) : void;
        fetch(query : any, page : number, perPage : number,
              onError:(any) => void, onResult:(data:Array<T>) => void, cursorDecorator? : (any) => void) : CursorFilter;
        fetchFirst(query : any, onError:(any) => void, onResult:(T) => void ) : void
    }

    export class MongoDBRepository<T> implements DocumentRepository<T> {

        private _collection : any;

        constructor(collectionName : string, db : any) {
            this._collection = db.collection(collectionName);
        }

        removeAll(onError: (error) => void, onResult:() => void) : void {
            this._collection.remove({}, (err, numberOfRemovedDocs) => {
                if(err) {
                    onError(err);
                } else {
                    onResult();
                }
            });
        }

        save(data : T | Array<T> , onError:(any) => void, onResult:() => void) : void {
            console.info('mongodb insert requested');
            this._collection.insert(data, (err,res) => {
                if(err) {
                    onError(err);
                } else {
                    console.info('mongodb insert success');
                    onResult();
                }
            });
        }

        fetch(query : any, page : number, perPage : number,
              onError:(any) => void, onResult:(data:Array<T>) => void, cursorDecorator? : (any) => void) : CursorFilter {
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
            return cursor;
        }

        fetchFirst(query:any, onError:(any)=>void, onResult:(T)=>void):void {
            this.fetch(query, 1, 1, onError, (data:Array<T>) => onResult(data[0]));
        }

        private requestFetch<T>(cursor : any, onError: (any) => void, onResult: (T) => void) {
            console.info('mongodb fetch requested');
            let result : Array<T> = [];
            cursor.each((error, doc) => {
                let cursorItem : T = doc;
                if(error) {
                    onError(error);
                } else if (cursorItem) {
                    result.push(cursorItem);
                } else {
                    console.log('mongodb fetch succeeded: ' + result.length + ' items retrieved');
                    onResult(result);
                }
            });
        }

    }
}