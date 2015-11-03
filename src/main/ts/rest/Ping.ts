import {Inject, PostConstruct} from '../../../../lib/container';
import {api} from '../api';

var Joi = require('joi');

export class Ping {

    @Inject('expressServer')
    expressServer : api.ExpressServer;

    @PostConstruct
    init() {

        this.expressServer.get('/ping', (req, res) => {
            res.send('pong');
        });

    }
}