"use strict";

import {repository} from '../../../src/main/ts/repository';
import {model} from '../../../src/main/ts/model';

import {setupChai, TINGODB_PATH} from './test_utils'

var expect = require('chai').expect;
setupChai();

class MyType {
    id:number = 1;
    name:string;
    timestamp : Date = new Date();
}

function createItems(count : Number) : Array<MyType> {
    let items : Array<MyType> = [];
    for(let i = 0; i < count; i++) {
        let item = new MyType();
        item.id = i;
        items.push(item);
    }
    return items;
}

describe('MongoDBRepository', () => {

    let sut : repository.MongoDBRepository<MyType>;

    let errorHandler = (error) => { throw 'failed: ' + JSON.stringify(error) };

    beforeEach( (done) => {
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
        sut.save(new MyType(), errorHandler, (data : Array<any>) => {
            expect(data.length).equals(1);
            expect(data[0]._id == 2).to.be.true;
            expect(data[0].id).equals(1);
            done();
        });
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

    it('(with promise) should allow insertion of elements and then retrieval', (done) => {
        let item = new MyType();

        sut.saveQ(item)
            .then(() => { return sut.fetchQ({}, 1, 10) })
            .should.eventually.have.lengthOf(1)
            .and.satisfy(items => { return items[0].id == '1' })
            .and.notify(done);
    });

    it('should allow fetching saved items', (done) => {
        let items = createItems(100);
        sut.save(items, errorHandler, () => {
            sut.fetch({}, 1, 10, errorHandler, (results) => {
                expect(results.length).equals(10);
                expect(results.every(item => {return item.id < 10})).to.be.true;
                done();
            });
        });
    });

    it('(with promise) should allow fetching saved items', (done) => {
        let items = createItems(100);
        sut.saveQ(items)
            .then(() => { return sut.fetchQ({}, 1, 10) })
            .should.eventually.have.lengthOf(10)
            .and.satisfy(items => { return items.every(item => {return item.id < 10})})
            .and.notify(done);
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

    it('(with promises) should allow updating saved items', async function(done) {
        let item = new MyType();
        item.id = 101;
        item.name = 'testName';

        let updateItem = new MyType();
        updateItem.id = 101;
        updateItem.name = 'testNameUpdated';

        let query = {id : 101};

        await sut.saveQ(item);
        await sut.updateQ(query, updateItem);
        let items : any = await sut.fetchQ(query, 1, 10);

        expect(items.every(item => {return item.name === 'testNameUpsdated'}));

        done();
    });

    it('pagination returns the correct items', (done) => {
        let items = createItems(100);
        sut.save(items, errorHandler, () => {
            sut.fetch({}, 3, 20, errorHandler, (results) => {
                expect(results.length).equals(20);
                expect(results.every(item => {return item.id < 60 && item.id > 39})).to.be.true;
                done();
            });
        });
    });

    it('(with promises) pagination returns the correct items', (done) => {
        let items = createItems(100);

        sut.saveQ(items)
            .then(() => {return sut.fetchQ({}, 3, 20)})
            .should.eventually.have.lengthOf(20)
            .and.satisfy(results => {return results.every(item => {return item.id < 60 && item.id > 39})})
            .and.notify(done);
    });

    it('should allow fetching a single item', (done) => {
        let items = createItems(100);
        sut.save(items, errorHandler, () => {
            sut.fetchFirst({id : 45}, errorHandler, (result) => {
                expect(result.id).equals(45);
                done();
            });
        });
    });

    it('(with promises) should allow fetching a single item', (done) => {
        let items = createItems(100);
        sut.saveQ(items)
            .then(() => sut.fetchFirstQ({id : 45}))
            .should.eventually.satisfy(item => {return item.id === 45})
            .and.notify(done);
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

    it('(with promises) should allow removing a single item', (done) => {
        let item = new MyType();
        item.id = 101;

        let query = {id : 101};

        sut.saveQ(item)
            .then(() => { return sut.removeQ(query)})
            .then(() => { return sut.fetchFirstQ(query)})
            .should.eventually.be.empty
            .and.notify(done);
    });

    it('should return items ordered by ascending date when the old item is added first', (done) => {
        let oldItem = new MyType();
        oldItem.id = 112512;
        let newItem = new MyType();
        newItem.id = 45745845;
        oldItem.timestamp.setTime(new Date().getTime() - 10000);


        sut.saveQ([oldItem, newItem])
            .then(() => { return sut.fetchQ({}, 1, 10, (cursor) => {cursor.sort({'timestamp' : 'ascending'})})})
            .should.eventually.have.lengthOf(2)
            .and.satisfy(items => {return items[0].id == oldItem.id && items[1].id == newItem.id})
            .and.notify(done);
    });

    it('should return items ordered by ascending date when the new item is added first', (done) => {
        let oldItem = new MyType();
        oldItem.id = 112512;
        let newItem = new MyType();
        newItem.id = 45745845;
        oldItem.timestamp.setTime(new Date().getTime() - 10000);


        sut.saveQ([newItem, oldItem])
            .then(() => { return sut.fetchQ({}, 1, 10, (cursor) => {cursor.sort({'timestamp' : 'ascending'})})})
            .should.eventually.have.lengthOf(2)
            .and.satisfy(items => {return items[0].id == oldItem.id && items[1].id == newItem.id})
            .and.notify(done);
    });

    it('should return items ordered by descending date when the old item is added first', (done) => {
        let oldItem = new MyType();
        oldItem.id = 112512;
        let newItem = new MyType();
        newItem.id = 45745845;
        oldItem.timestamp.setTime(new Date().getTime() - 10000);


        sut.saveQ([oldItem,  newItem])
            .then(() => { return sut.fetchQ({}, 1, 10, (cursor) => {cursor.sort({'timestamp' : 'descending'})})})
            .should.eventually.have.lengthOf(2)
            .and.satisfy(items => {return items[1].id == oldItem.id && items[0].id == newItem.id})
            .and.notify(done);
    });

    it('should return items ordered by descending date when the new item is added first', (done) => {
        let oldItem = new MyType();
        oldItem.id = 112512;
        let newItem = new MyType();
        newItem.id = 45745845;
        oldItem.timestamp.setTime(new Date().getTime() - 10000);


        sut.saveQ([newItem, oldItem])
            .then(() => { return sut.fetchQ({}, 1, 10, (cursor) => {cursor.sort({'timestamp' : 'descending'})})})
            .should.eventually.have.lengthOf(2)
            .and.satisfy(items => {return items[1].id == oldItem.id && items[0].id == newItem.id})
            .and.notify(done);
    });

});



