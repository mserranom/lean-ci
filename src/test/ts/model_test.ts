///<reference path="../../../lib/node-0.10.d.ts"/>
///<reference path="../../../lib/chai.d.ts"/>
///<reference path="../../../lib/mocha.d.ts"/>
///<reference path="../../../src/main/ts/model.ts"/>

import {model} from '../../../src/main/ts/model';
import {expect} from 'chai';

describe('BuildQueue', () => {

    let repo1Build = new model.Project('repo1');
    let repo1Build2 = new model.Project('repo1');
    let repo2Build = new model.Project('repo');

    let dep : model.ProjectDependency = {upstream : repo1Build, downstream : repo2Build};
    repo1Build.downstreamDependencies = repo1Build.downstreamDependencies.add(dep);
    repo2Build.upstreamDependencies = repo2Build.upstreamDependencies.add(dep);

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
        expect(queue.activeBuilds().contains(repo1Build2)).to.be.false;
    });

    it('downstream dependencies should be added to the queue when a project has finished',() => {
        let queue = new model.BuildQueue();
        queue.add(repo1Build);
        queue.next();
        queue.finish(repo1Build);
        expect(queue.next()).equals(repo2Build);
        queue.finish(repo2Build);
        expect(queue.next()).to.be.null;
    });

    it('being 1 the max concurrent builds, next() should return null while the previous hasnt finished',() => {
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

