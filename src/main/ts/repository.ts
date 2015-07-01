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

    export interface BuildResultRepository {
        save(result : model.BuildResult, onResult?:(any) => void, onError?:(any) => void);
        saveAll(result : Array<model.BuildResult>, onResult?:(any) => void, onError?:(any) => void);
        fetch(onResult:(data:Array<model.BuildResult>) => void, pageSize : number, pageStart : number, onError?:(any) => void);
    }

    export class MockBuildResultRepository implements BuildResultRepository {

        private _data : Array<model.BuildResult> = [];

        save(result:model.BuildResult, onResult:(p1:any)=>void, onError?:(any) => void) {
            this._data.push(result);
            if(onResult) {
                onResult('success');
            }
        }

        saveAll(results:Array<model.BuildResult>, onResult:(p1:any)=>void, onError?:(any) => void) {
            results.forEach(res => this._data.push(res));
            if(onResult) {
                onResult('success');
            }

        }

        fetch(onResult:(p1:Array<model.BuildResult>)=>void, pageSize:number, pageStart:number, onError?:(any) => void) {
            let data = (this._data.length < pageStart) ? [] : this._data.slice(pageStart, pageStart + pageSize);
            setTimeout(100, () => onResult(data));
        }
    }

    export interface CursorFilter {
        sort(value:number);
    }

    export class MongoDBRepository<T> {

        private _collection : any;

        constructor(collectionName : string, db : any) {
            this._collection = db.collection(collectionName);
        }

        removeAll(onError: (error) => void, onResult:() => void) {
            this._collection.remove({}, (err, numberOfRemovedDocs) => {
                if(err) {
                    onError(err);
                } else {
                    onResult();
                }
            });
        }

        save(data : T | Array<T> , onError:(any) => void, onResult:() => void) {
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
              onError:(any) => void, onResult:(data:Array<T>) => void) : CursorFilter {
            // scales badly perhaps http://blog.mongodirector.com/fast-paging-with-mongodb/
            // http://docs.mongodb.org/manual/reference/method/cursor.skip/
            let index = page - 1;
            index = Math.max(0, index);
            let cursor = this._collection.find(query)
                .skip(index * perPage).limit(perPage);
            this.requestFetch(cursor, onError, onResult);
            return cursor;
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