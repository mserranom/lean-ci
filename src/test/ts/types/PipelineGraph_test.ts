"use strict";

import {model} from '../../../../src/main/ts/model';
import {PipelineGraph} from '../../../../src/main/ts/types/PipelineGraph';

import {setupChai} from '../test_utils'

var expect = require('chai').expect;
setupChai();

describe('PipelineGraph', () => {

    const upRepo = 'org/upRepo';
    const downRepo = 'org/downRepo';

    //TODO: remove any in 'data' and use Object.assign() in all the tests for static type check

    it('should throw an error when there are circular dependencies',  () => {
        let data  = {
            jobs: [Object.assign(model.createBuildSchema(), {_id : '1', repo: upRepo, status: model.BuildStatus.IDLE}),
                   Object.assign(model.createBuildSchema(),{_id : '2', repo: downRepo, status: model.BuildStatus.IDLE})],
            dependencies : [{up : upRepo, down : downRepo}, {up : downRepo, down : upRepo}]
        };

        let call = () => PipelineGraph.fromSchemas(data.dependencies, data.jobs);
        expect(call).to.throw(/pipeline graph contains circular dependencies:/);
    });

    it('should throw an error when there is more than one starting node in the build graph',  () => {
        let data : any  = {
            jobs: [{_id : '101', repo: '1', status: model.BuildStatus.IDLE},
                   {_id : '102', repo: '2', status: model.BuildStatus.IDLE},
                   {_id : '103', repo: '3', status: model.BuildStatus.IDLE}],
            dependencies : [{up : '1', down : '3'}, {up : '2', down : '3'}]
        };

        let call = () => PipelineGraph.fromSchemas(data.dependencies, data.jobs);
        expect(call).to.throw(/pipeline graph has more than one source nodes:/);
    });

    describe('single job pipeline', () => {

        it('when the job is idle, next() should return the job',  () => {
            let data : any  = {
                jobs : [{_id : '101', repo : '1', status : model.BuildStatus.IDLE }],
                dependencies : []
            };

            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);

            expect(pipeline.nextIdle()).deep.equal(data.jobs[0]);
        });

        it('when the job is not idle, next() should return null',  () => {
            let data : any = {
                _id : '0',
                jobs : [{_id : '101', repo : '1', status : model.BuildStatus.QUEUED }],
                dependencies : []
            };


            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;

            data.jobs[0].status = model.BuildStatus.FAILED;
            pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;

            data.jobs[0].status = model.BuildStatus.SUCCESS;
            pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;

            data.jobs[0].status = model.BuildStatus.RUNNING;
            pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;
        });
    });


    //
    //  \1\ -> \2\
    //
    describe('two job pipeline', () => {

        it('when the 1st job is idle, should return it as next',  () => {
            let data : any = {
                jobs : [{_id : '101', repo : upRepo, status : model.BuildStatus.IDLE },
                        {_id : '102', repo : downRepo, status : model.BuildStatus.IDLE }],
                dependencies : [{up : upRepo, down : downRepo}]
            };

            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);

            expect(pipeline.nextIdle()).deep.equal(data.jobs[0]);
        });

        it('when the 1st job has succeeded, should return the 2nd as next',  () => {
            let data : any  = {
                jobs : [{_id : '101', repo : upRepo, status : model.BuildStatus.SUCCESS },
                        {_id : '102', repo : downRepo, status : model.BuildStatus.IDLE }],
                dependencies : [{up : upRepo, down : downRepo}]
            };

            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);

            expect(pipeline.nextIdle()).deep.equal(data.jobs[1]);
        });

        it('when all the jobs are finished, should return null as next',  () => {
            let data : any = {
                jobs : [{_id : '101', repo : upRepo, status : model.BuildStatus.SUCCESS },
                        {_id : '102', repo : downRepo, status : model.BuildStatus.SUCCESS }],
                dependencies : [{up : upRepo, down : downRepo}]
            };

            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;

            // failed is also a finished state
            data.jobs[1].status = model.BuildStatus.FAILED;
            pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;
        });

        it('when the 1st job is in "failed", "running" or "queued" state, should return null as next',  () => {
            let data : any = {
                jobs : [{_id : '101', repo : upRepo, status : model.BuildStatus.FAILED },
                        {_id : '102', repo : downRepo, status : model.BuildStatus.IDLE }],
                dependencies : [{up : upRepo, down : downRepo}]
            };

            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;

            data.jobs[0].status = model.BuildStatus.RUNNING;
            pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;

            data.jobs[0].status = model.BuildStatus.QUEUED;
            expect(pipeline.nextIdle()).to.be.null;
        });

    });

    //
    //       -> |2|-
    //     /          \
    //  \1\            -> |4|   //check http://asciiflow.com/
    //     \          /
    //       -> |3|-
    //
    describe('4 build, diamond pipeline', () => {

        let createGraph = function() {
            return {
                jobs : [{_id : '101', repo : '1', status : model.BuildStatus.IDLE },
                        {_id : '102', repo : '2', status : model.BuildStatus.IDLE },
                        {_id : '103', repo : '3', status : model.BuildStatus.IDLE },
                        {_id : '104', repo : '4', status : model.BuildStatus.IDLE }],
                dependencies : [{up : '1', down : '2'}, {up : '1', down : '3'},
                                {up : '2', down : '4'}, {up : '3', down : '4'}]
            };
        };

        let data : any;

        beforeEach( () => {
            data = createGraph();
        });

        it('when the 1st job is idle, should return it as next',  () => {
            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).deep.equal(data.jobs[0]);
        });

        it('when the 1st job succeeds, should return the 2nd or 3rd as next',  () => {
            data.jobs[0].status = model.BuildStatus.SUCCESS;

            let next = PipelineGraph.fromSchemas(data.dependencies, data.jobs).nextIdle();

            expect(next.repo == '2' || next.repo == '3').to.be.true;
        });

        it('when the 1st and 2nd job succeeds, should wait for the 3rd to succeed before queuing the 4th',  () => {

            data.jobs[0].status = model.BuildStatus.SUCCESS;
            data.jobs[1].status = model.BuildStatus.SUCCESS;
            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).deep.equal(data.jobs[2]);

            data.jobs[2].status = model.BuildStatus.QUEUED;
            pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;

            data.jobs[2].status = model.BuildStatus.SUCCESS;
            pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).deep.equal(data.jobs[3]);
        });

        it('when all the jobs are finished, should return null as next',  () => {
            data.jobs.forEach((build : model.BuildSchema) => build.status = model.BuildStatus.SUCCESS);
            let pipeline = PipelineGraph.fromSchemas(data.dependencies, data.jobs);
            expect(pipeline.nextIdle()).to.be.null;
        });

    });
});



