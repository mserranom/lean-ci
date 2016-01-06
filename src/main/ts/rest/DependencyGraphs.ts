"use strict";

import {Inject} from '../../../../lib/container';
import {RequestMapping} from './express_decorators';
import {model} from '../model';
import {repository} from '../repository';

export class DependencyGraphs {

    @Inject('dependencyGraphsRepository')
    dependencyGraphs : repository.DocumentRepositoryQ<model.DependencyGraphSchema>;

    @RequestMapping('GET', '/dependency_graphs', ['userId', 'page', 'per_page'])
    getGraphs(userId : string, page : string, perPage : string) : Q.Promise<Array<model.DependencyGraphSchema>> {

        let intPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
        let intPerPage = isNaN(parseInt(perPage)) ? 10 : parseInt(perPage);

        return this.dependencyGraphs.fetchQ({userId : userId}, intPage, intPerPage);
    }

    @RequestMapping('GET', '/dependency_graphs/:id', ['userId'])
    getGraph(id : string, userId : string) : Q.Promise<model.DependencyGraphSchema> {
        return this.dependencyGraphs.fetchFirstQ({userId : userId, _id : id});
    }
}