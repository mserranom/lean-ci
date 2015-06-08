///<reference path="../../../lib/node-0.10.d.ts"/>
///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>
///<reference path="../../../src/main/ts/model.ts"/>

//var expect = require('chai').expect;
import {model} from '../../../src/main/ts/model';
import {expect} from 'chai';

describe('BuildQueue', () => {

    let repo1Build = {repo : 'repo1'};
    let repo1Build2 = {repo : 'repo1'};
    let repo1Build3 = {repo : 'repo1'};
    let repo2Build = {repo : 'repo'};

    it('next() should be initially null',() => {
        let queue = new model.BuildQueue();
        expect(queue.next()).to.be.null;
    });

    it('first added item should be returned with next()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        expect(queue.next()).equals(repo1Build);
    });

    it('activeBuilds() should contain items returned with next()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo2Build);
        queue.next();
        expect(queue.activeBuilds().size).equals(2);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.true;
        expect(queue.activeBuilds().contains(repo2Build)).to.be.true;
    });

    it('finish() should remove items from activeBuilds()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        expect(queue.next()).equals(repo1Build);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.true;
        queue.finish(repo1Build);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.false;
    });

    it('a 2nd scheduled build in the same repo shouldnt be added to activeBuilds()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo1Build2);
        expect(queue.activeBuilds().contains(repo1Build2)).to.be.false;
    });

});

