"use strict";

import {RequestMapping} from './express_decorators';


export class Ping {

    @RequestMapping('GET', '/ping')
    ping() : string {
        return 'pong';
    }
}