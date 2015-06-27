import {model} from './model';
import {config} from './config';


export module repository {

    var mongodb = require("mongodb");

    export function mongodbConnect(url:string, callback:(err,db) => void) {
        let client = mongodb.MongoClient;
        client.connect(url, callback);
    }

    export class BuildResultRepository {

        private _db : any;
        private _errorHandler : (any) => void;

        constructor(db : any, errorHandler: (any) => void) {
            this._db = db;
            this._errorHandler = errorHandler;
        }

        save(result : model.BuildResult, onResult?:(any) => void) {
            this._db.collection('build_results').insert(result, (err,res) => {
                if(err) {
                    this._errorHandler(err);
                } else {
                    onResult(res);
                }
            });
        }

        saveAll(result : Array<model.BuildResult>, onResult?:(any) => void) {
            this._db.collection('build_results').insertMany(result, (err,res) => {
                if(err) {
                    this._errorHandler(err);
                } else {
                    onResult(res);
                }
            });
        }

        fetch(onResult:(data:Array<model.BuildResult>) => void) {
            let cursor = this._db.collection('build_results').find();
            this.requestFetch(cursor, onResult);
        }

        private requestFetch<T>(cursor : any, onResult: (T) => void) {
            let result : Array<T> = [];
            cursor.each((error, doc) => {
                let cursorItem : T = doc;
                if(error) {
                    this._errorHandler(error);
                } else if (cursorItem) {
                    result.push(cursorItem);
                } else {
                    onResult(result);
                }
            });
        }

    }
}