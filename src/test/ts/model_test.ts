///<reference path="../../../lib/node-0.10.d.ts"/>
///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>
///<reference path="../../../src/main/ts/model.ts"/>

import {model} from '../../../src/main/ts/model';
import {expect} from 'chai';

class BuildRequestImpl implements model.BuildRequest {

    constructor(repo : string) {
       this.repo = repo;
    }

    user:string;
    requestTimestamp:Date;
    processedTimestamp:Date;
    id:string;
    repo:string;
    commit:string;
    pingURL:string;

}

describe('BuildQueue: ', () => {

    let repo1Build = new BuildRequestImpl('repo1');
    let repo1Build2 = new BuildRequestImpl('repo1');
    let repo2Build = new BuildRequestImpl('repo');

    it('next() should be initially null',() => {
        let queue = new model.BuildQueue();
        expect(queue.next()).to.be.null;
    });

    it('first added project should be returned with next()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        expect(queue.next()).equals(repo1Build);
    });

    it('activeBuilds() should contain projects returned with next()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo2Build);
        queue.next();
        expect(queue.activeBuilds().size).equals(1);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.true;
        expect(queue.activeBuilds().contains(repo2Build)).to.be.false;
    });

    it('finish() should remove projects from activeBuilds()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        expect(queue.next()).equals(repo1Build);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.true;
        queue.finish(repo1Build);
        expect(queue.activeBuilds().contains(repo1Build)).to.be.false;
    });

    it('a 2nd scheduled build of the same project shouldnt be added to activeBuilds()',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo1Build2);
        expect(queue.next()).to.be.null;
        expect(queue.activeBuilds().contains(repo1Build2)).to.be.false;
    });

    it('being 1 the max concurrent builds, projects shouldnt be added to activeBuilds with next() ',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.add(repo1Build2); //project added before the previous finishes
        queue.finish(repo1Build);
        queue.next();

        //there's another project in the queue: the dependant one, but there's another one active
        expect(queue.next()).to.be.null;
    });

});

describe('AllProjects: ', () => {

    let sut : model.AllProjects;

    beforeEach(() => {
        sut = new model.AllProjects();
    });

    it('should be empty initially',() => {
        expect(sut.getProjects()).to.be.empty;
    });

    it('should return added repos',() => {
        sut.addNewProject('group/repo1');
        sut.addNewProject('group/repo2');

        expect(sut.getProjects().length).equals(2);
        expect(sut.getProject('group/repo1')).not.to.be.null;
        expect(sut.getProject('group/repo2')).not.to.be.null;
    });

    it('should return null for non existing repo',() => {
        expect(sut.getProject('group/foo')).to.be.undefined;
    });

});



