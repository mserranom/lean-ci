"use strict";

import {model} from '../../../../src/main/ts/model';
import {DependencyGraph} from '../../../../src/main/ts/types/DependencyGraph';
import {expect} from 'chai';

import {setupChai} from '../test_utils'

setupChai();

describe('DependencyGraph', () => {

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


    it('should fail generating dependency graphs with circular dependencies', () => {
        let originalData = createDependencyGraphSchema();

        let dependency = originalData.graphSchema.dependencies[0];
        let reversedDependency : model.Dependency = {up : dependency.down, down : dependency.up};
        originalData.graphSchema.dependencies.push(reversedDependency);

        let call = () => DependencyGraph.fromSchemas(originalData.graphSchema, originalData.repos);

        expect(call).to.throw(/cannot create dependency graph, contains circular dependencies/);
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
                repos : [testRepo1.name, testRepo2.name, testRepo3.name, testRepo4.name,testRepo5.name, unconnectedRepo.name],
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

            let originalGraph = DependencyGraph.fromSchemas(originalData.graphSchema, originalData.repos);

            let newGraph = originalGraph.createSubgraph(testRepo3);

            expect(newGraph).not.to.be.null;
            expect(newGraph).not.equals(originalGraph);
        });

        it('should strip unconnected nodes of the graph and predecessors of the subgraph source', () => {
            let originalData = createDependencyGraphSchema();

            let originalGraph = DependencyGraph.fromSchemas(originalData.graphSchema, originalData.repos);

            let newGraph = originalGraph.createSubgraph(testRepo3);

            expect(newGraph.getRepos()).deep.equal([testRepo3, testRepo4, testRepo5]);

            expect(newGraph.getDependencies()).deep.equal([{up : testRepo3.name, down: testRepo4.name},
                                                           {up : testRepo3.name, down: testRepo5.name}]);
        });

        it('if created from a sink node, the returned graph is that only node', () => {
            let originalData = createDependencyGraphSchema();

            let originalGraph = DependencyGraph.fromSchemas(originalData.graphSchema, originalData.repos);

            let newGraph = originalGraph.createSubgraph(testRepo4);

            expect(newGraph.getRepos().length).equals(1);
            expect(newGraph.getRepos()).deep.equal([testRepo4]);
        });

    });


});



