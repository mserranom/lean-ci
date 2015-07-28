///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>

import {repository} from '../../../src/main/ts/repository';
import {model} from '../../../src/main/ts/model';
import {expect} from 'chai';

let TINGODB_PATH = 'target/test';

class MyType {
    id:number = 1;
    name:string;
}

describe('MongoDBRepository', () => {

    let sut : repository.MongoDBRepository<MyType>;

    let errorHandler = (error) => { throw 'failed: ' + JSON.stringify(error) };

    beforeEach( (done) => {

        // CHANGE THIS TO EXECUTE AGAINST A MONGO DB
        //repository.mongodbConnect(MONGO_URL, (err,db) => {
        
        repository.tingodbConnect(TINGODB_PATH, (err,db) => {
            if(err) {
                throw err;
            } else {
                sut = new repository.MongoDBRepository<MyType>('MyType_collection', db);
                sut.removeAll( errorHandler, () => done() );
            }
        });
    });

    afterEach( (done) => {
        sut.removeAll( errorHandler, () => done() );
    });

    it('shouldnt fail when inserting elements', (done) => {

        sut.save(new MyType(), errorHandler, () => done());
    });

    it('should allow insertion of elements and then retrieval', (done) => {
        let item = new MyType();
        sut.save(item, errorHandler, () => {
            sut.fetch({}, 1, 10, errorHandler, (results) => {
                expect(results.length).equals(1);
                expect(results[0].id).equals(item.id);
                done();
            });
        });
    });

    it('should allow fetching saved items', (done) => {
        let items = new Array<MyType>();
        for(let i = 0; i < 100; i++) {
            let item = new MyType();
            item.id = i;
            items.push(item);
        }
        sut.save(items, errorHandler, () => {
            sut.fetch({}, 1, 10, errorHandler, (results) => {
                expect(results.length).equals(10);
                expect(results.every(item => {return item.id < 10})).to.be.true;
                done();
            });
        });
    });

    it('should allow updating saved items', (done) => {
        let item = new MyType();
        item.id = 101;
        item.name = 'testName';

        let updateItem = new MyType();
        updateItem.id = 101;
        updateItem.name = 'testNameUpdated';

        let query = {id : 101};

        sut.save(item, errorHandler, () => {

            sut.update(query, updateItem, errorHandler, () => {

                sut.fetch(query, 1, 10, errorHandler, (results) => {
                    expect(results.every(item => {return item.name === 'testNameUpdated'})).to.be.true;
                    done();
                });
            });
        });
    });

    it('pagination returns the correct items', (done) => {
        let items = new Array<MyType>();
        for(let i = 0; i < 100; i++) {
            let item = new MyType();
            item.id = i;
            items.push(item);
        }
        sut.save(items, errorHandler, () => {
            sut.fetch({}, 3, 20, errorHandler, (results) => {
                expect(results.length).equals(20);
                expect(results.every(item => {return item.id < 60 && item.id > 39})).to.be.true;
                done();
            });
        });
    });

    it('should allow fetching a single item', (done) => {
        let items = new Array<MyType>();
        for(let i = 0; i < 100; i++) {
            let item = new MyType();
            item.id = i;
            items.push(item);
        }
        sut.save(items, errorHandler, () => {
            sut.fetchFirst({id : 45}, errorHandler, (result) => {
                expect(result.id).equals(45);
                done();
            });
        });
    });

    it('should allow removing a single item', (done) => {
        let item = new MyType();
        item.id = 101;

        let query = {id : 101};

        sut.save(item, errorHandler, () => {
            sut.remove(query, errorHandler, () =>{
                sut.fetchFirst(query, errorHandler, (result) => {
                    expect(result).to.be.empty;
                    done();
                });
            });
        });
    });

});



