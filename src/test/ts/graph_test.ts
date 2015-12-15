import {createDependencyGraphFromSchema,createDependencySchemaFromGraph,
    createBuildPipelineGraphFromSchema, creatBuildPipelineSchemaFromGraph,
    getDependencySubgraph} from '../../../src/main/ts/graph';
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

            let graph = createDependencyGraphFromSchema(originalData.graphSchema, originalData.repos);
            let regeneratedData = createDependencySchemaFromGraph(graph, originalData.graphSchema._id, originalData.graphSchema.userId);

            expect(regeneratedData).deep.equal(originalData.graphSchema);
        });

        it('should serialise/deserialise dependency graphs ignoring non-existing repos', () => {
            let originalData = createDependencyGraphSchema();
            originalData.graphSchema.dependencies.push({up : 'a/repo1', down: 'a/foo' });

            let expectedData = createDependencyGraphSchema();

            let graph = createDependencyGraphFromSchema(originalData.graphSchema, originalData.repos);
            let regeneratedData = createDependencySchemaFromGraph(graph, originalData.graphSchema._id, originalData.graphSchema.userId);

            expect(regeneratedData).deep.equal(expectedData.graphSchema);
        });

        it('should fail generating dependency graphs with circular dependencies', () => {
            let originalData = createDependencyGraphSchema();

            let dependency = originalData.graphSchema.dependencies[0];
            let reversedDependency : model.Dependency = {up : dependency.down, down : dependency.up};
            originalData.graphSchema.dependencies.push(reversedDependency);

            let call = () => createDependencyGraphFromSchema(originalData.graphSchema, originalData.repos);

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
                status : model.PipelineStatus.RUNNING,
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

            let graph = createBuildPipelineGraphFromSchema(originalData.graphSchema, originalData.jobs);
            let regeneratedData = creatBuildPipelineSchemaFromGraph(
                graph, originalData.graphSchema._id, originalData.graphSchema.userId, model.PipelineStatus.RUNNING);

            expect(regeneratedData).deep.equal(originalData.graphSchema);
        });

        it('should serialise/deserialise build pipeline graphs ignoring non-existing repos', () => {
            let originalData = createBuildPipelineGraphSchema();
            originalData.graphSchema.dependencies.push({up : 'job1', down: 'jobFoo' });

            let expectedData = createBuildPipelineGraphSchema();

            let graph = createBuildPipelineGraphFromSchema(originalData.graphSchema, originalData.jobs);
            let regeneratedData = creatBuildPipelineSchemaFromGraph(
                graph, originalData.graphSchema._id, originalData.graphSchema.userId, model.PipelineStatus.RUNNING);

            expect(regeneratedData).deep.equal(expectedData.graphSchema);

        });

        it('should fail generating cyclic dependency graphs', () => {
            let originalData = createBuildPipelineGraphSchema();

            let dependency = originalData.graphSchema.dependencies[0];
            let reversedDependency : model.Dependency = {up : dependency.down, down : dependency.up};
            originalData.graphSchema.dependencies.push(reversedDependency);

            let call = () => createBuildPipelineGraphFromSchema(originalData.graphSchema, originalData.jobs);

            expect(call).to.throw(/cannot create pipeline graph, contains circular dependencies/);
        });

        it('should fail generating build pipeline graphs with multiple graph sources', () => {
            let originalData = createBuildPipelineGraphSchema();

            originalData.jobs.set('fooId', {_id : 'fooId', status : model.BuildStatus.IDLE});
            originalData.graphSchema.dependencies.push({up : 'fooId', down: 'job2' });

            let call = () => createBuildPipelineGraphFromSchema(originalData.graphSchema, originalData.jobs);

            expect(call).to.throw(/cannot create pipeline graph, it has more than one source nodes/);
        });
    });

    describe('subgraph creation:', () => {

        let testRepo1 : model.Repository = { userId : '1', name : 'a/repo1' };
        let testRepo2 : model.Repository = { userId : '1', name : 'a/repo2' };
        let testRepo3 : model.Repository = { userId : '1', name : 'a/repo3' };
        let testRepo4 : model.Repository = { userId : '1', name : 'a/repo4' };
        let testRepo5 : model.Repository = { userId : '1', name : 'a/repo5' };
        let unconnectedRepo : model.Repository = { userId : '1', name : 'a/repoUnconnected' };

        interface DependencyTestData {
            graphSchema : model.DependencyGraphSchema,
            repos : Map<string,model.Repository>;
        }

        function createDependencyGraphSchema() : DependencyTestData {
            let data : model.DependencyGraphSchema = {
                _id : '1',
                userId : testRepo1.userId,
                repos : [testRepo1.name, testRepo2.name, testRepo3.name, testRepo4.name, unconnectedRepo.name],
                dependencies : [{up : testRepo1.name, down: testRepo2.name },
                                {up : testRepo1.name, down: testRepo3.name },
                                {up : testRepo3.name, down: testRepo4.name },
                                {up : testRepo3.name, down: testRepo5.name }]
            };

            let repos : Map<string, model.Repository> = new Map();
            repos.set(testRepo1.name, {userId : data.userId, name : testRepo1.name});
            repos.set(testRepo2.name, {userId : data.userId, name : testRepo2.name});
            repos.set(testRepo3.name, {userId : data.userId, name : testRepo3.name});
            repos.set(testRepo4.name, {userId : data.userId, name : testRepo4.name});
            repos.set(testRepo5.name, {userId : data.userId, name : testRepo5.name});
            repos.set(unconnectedRepo.name, {userId : data.userId, name : unconnectedRepo.name});

            return {graphSchema : data, repos : repos}
        }

        it('should not alter the original graph', () => {
            let originalData = createDependencyGraphSchema();

            let originalGraph = createDependencyGraphFromSchema(originalData.graphSchema, originalData.repos);

            let newGraph = getDependencySubgraph(originalGraph, testRepo3);

            expect(newGraph).not.to.be.null;
            expect(newGraph).not.equals(originalGraph);
        });

        it('should strip unconnected nodes of the graph and predecessors of the subgraph source', () => {
            let originalData = createDependencyGraphSchema();

            let originalGraph = createDependencyGraphFromSchema(originalData.graphSchema, originalData.repos);

            let newGraph = getDependencySubgraph(originalGraph, testRepo3);

            expect(newGraph.nodeCount()).equals(3);
            expect(newGraph.hasNode(testRepo3.name)).to.be.true;
            expect(newGraph.hasNode(testRepo4.name)).to.be.true;
            expect(newGraph.hasNode(testRepo5.name)).to.be.true;
            expect(newGraph.hasEdge(testRepo3.name, testRepo4.name)).to.be.true;
        });

        it('if created from a sink node, the returned graph is that only node', () => {
            let originalData = createDependencyGraphSchema();

            let originalGraph = createDependencyGraphFromSchema(originalData.graphSchema, originalData.repos);

            let newGraph = getDependencySubgraph(originalGraph, testRepo4);

            expect(newGraph.nodeCount()).equals(1);
            expect(newGraph.hasNode(testRepo4.name)).to.be.true;
        });

    });
});



