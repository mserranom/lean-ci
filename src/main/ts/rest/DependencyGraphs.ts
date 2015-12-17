"use strict";

import {Inject, PostConstruct} from '../../../../lib/container';
import {model} from '../model';
import {repository} from '../repository';
import {api} from '../api';

export class DependencyGraphs {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @Inject('dependencyGraphsRepository')
    dependencyGraphs : repository.DocumentRepositoryQ<model.DependencyGraphSchema>;

    @PostConstruct
    init() {

        let graphs = this.dependencyGraphs;

        this.expressServer.getPaged('/dependency_graphs', async function (req,res, userId : string, page: number, perPage : number) {
            try {
                let graphSchemas : Array<model.DependencyGraphSchema> = await graphs.fetchQ({userId : userId}, page, perPage);
                res.send(JSON.stringify(graphSchemas));
            } catch(error) {
                res.status(500).send(error);
            }
        });

        this.expressServer.get('/dependency_graphs/:id', async function (req,res, userId : string) {
            let id : string = req.params.id;
            try {
                let graph : model.DependencyGraphSchema = await graphs.fetchFirstQ({userId : userId, _id : id});
                res.send(JSON.stringify(graph));
            } catch(error) {
                res.status(500).send(error);
            }
        });
    }
}