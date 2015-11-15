import {createDependencyGraph,createDependencySchemaFromGraph,
    createPipelineGraph, creatPipelineSchemaFromGraph} from '../../../src/main/ts/graph';
import {model} from '../../../src/main/ts/model';
import {expect} from 'chai';

import {setupChai} from './test_utils'

setupChai();

describe('graph', () => {

    describe('dependency graphs:', () => {

        interface DependencyTestData {
            graphSchema : model.DependencyGraphSchema,
            repos : Map<string,model.Repository>;
        }

        function createDependencyGraphSchema() : DependencyTestData {
            let data : model.DependencyGraphSchema = {
                _id : '1',
                userId : 'aa',
                repos : ['a/repo1', 'a/repo2'],
                dependencies : [{up : 'a/repo1', down: 'a/repo2' }]
            };

            let repos : Map<string, model.Repository> = new Map();
            repos.set(data.repos[0], {userId : data.userId, name : data.repos[0]});
            repos.set(data.repos[1], {userId : data.userId, name : data.repos[1]});

            return {graphSchema : data, repos : repos}
        }

        it('should serialise/deserialise dependency graphs', () => {

            let originalData = createDependencyGraphSchema();

            let graph = createDependencyGraph(originalData.graphSchema, originalData.repos);
            let regeneratedData = createDependencySchemaFromGraph(graph, originalData.graphSchema._id, originalData.graphSchema.userId);

            expect(regeneratedData).deep.equal(originalData.graphSchema);
        });

        it('should serialise/deserialise dependency graphs ignoring non-existing repos', () => {
            let originalData = createDependencyGraphSchema();
            originalData.graphSchema.dependencies.push({up : 'a/repo1', down: 'a/foo' });

            let expectedData = createDependencyGraphSchema();

            let graph = createDependencyGraph(originalData.graphSchema, originalData.repos);
            let regeneratedData = createDependencySchemaFromGraph(graph, originalData.graphSchema._id, originalData.graphSchema.userId);

            expect(regeneratedData).deep.equal(expectedData.graphSchema);
        });

        it('should fail generating dependency graphs with circular dependencies', () => {
            let originalData = createDependencyGraphSchema();

            let dependency = originalData.graphSchema.dependencies[0];
            let reversedDependency : model.Dependency = {up : dependency.down, down : dependency.up};
            originalData.graphSchema.dependencies.push(reversedDependency);

            let call = () => createDependencyGraph(originalData.graphSchema, originalData.repos);

            expect(call).to.throw(/cannot create dependency graph, contains circular dependencies/);
        });

    });

    describe('build pipeline graphs:', () => {

        interface BuildPipepelineTestData {
            graphSchema : model.PipelineSchema,
            jobs : Map<string, model.Job>;
        }

        function createBuildPipelineGraphSchema() : BuildPipepelineTestData {
            let data : model.PipelineSchema = {
                _id : '1',
                userId : 'aa',
                jobs : ['job1', 'job2'],
                dependencies : [{up : 'job1', down: 'job2' }]
            };

            let jobs : Map<string, model.Job> = new Map();
            jobs.set(data.jobs[0], {_id : 'id1', status : model.BuildStatus.IDLE});
            jobs.set(data.jobs[1], {_id : 'id1', status : model.BuildStatus.IDLE});

            return {graphSchema : data, jobs : jobs}
        }

        it('should serialise/deserialise build pipeline graphs', () => {
            let originalData = createBuildPipelineGraphSchema();

            let graph = createPipelineGraph(originalData.graphSchema, originalData.jobs);
            let regeneratedData = creatPipelineSchemaFromGraph(graph, originalData.graphSchema._id, originalData.graphSchema.userId);

            expect(regeneratedData).deep.equal(originalData.graphSchema);
        });

        it('should serialise/deserialise build pipeline graphs ignoring non-existing repos', () => {
            let originalData = createBuildPipelineGraphSchema();
            originalData.graphSchema.dependencies.push({up : 'job1', down: 'jobFoo' });

            let expectedData = createBuildPipelineGraphSchema();

            let graph = createPipelineGraph(originalData.graphSchema, originalData.jobs);
            let regeneratedData = creatPipelineSchemaFromGraph(graph, originalData.graphSchema._id, originalData.graphSchema.userId);

            expect(regeneratedData).deep.equal(expectedData.graphSchema);

        });

        it('should fail generating cyclic dependency graphs', () => {
            let originalData = createBuildPipelineGraphSchema();

            let dependency = originalData.graphSchema.dependencies[0];
            let reversedDependency : model.Dependency = {up : dependency.down, down : dependency.up};
            originalData.graphSchema.dependencies.push(reversedDependency);

            let call = () => createPipelineGraph(originalData.graphSchema, originalData.jobs);

            expect(call).to.throw(/cannot create pipeline graph, contains circular dependencies/);
        });

        it('should fail generating build pipeline graphs with multiple graph sources', () => {
            let originalData = createBuildPipelineGraphSchema();

            originalData.jobs.set('fooId', {_id : 'fooId', status : model.BuildStatus.IDLE});
            originalData.graphSchema.dependencies.push({up : 'fooId', down: 'job2' });

            let call = () => createPipelineGraph(originalData.graphSchema, originalData.jobs);

            expect(call).to.throw(/cannot create pipeline graph, it has more than one source nodes/);
        });
    });
});



