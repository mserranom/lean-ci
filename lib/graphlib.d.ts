// Type definitions for graphlib
// Project: https://github.com/cpettitt/graphlib
// Definitions by: Valentin Trinque <https://github.com/ValentinTrinque>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

/**
 * @fileOverview This file is a Typescript Definition File for graphlib.
 * @author Chris Pettitt <https://github.com/cpettitt>
 * @author Valentin Trinque <https://github.com/ValentinTrinque>
 * @version 1.0.5
 */

/**
 * @name graphlib
 * @namespace Hold the functionalities related to graphlib library.
 */
declare module Graphlib {

    interface GraphOptions {
        directed: boolean;
        compound: boolean;
        multigraph: boolean;
    }

    class Graph<V, T> {
        constructor(opts?: GraphOptions);
        public isDirected(): boolean;
        public isMultigraph(): boolean;
        public isCompound(): boolean;
        public graph() : Graph<V, T>;
        public setGraph(label: any): Graph<V, T>;
        public nodeCount(): number;
        public edgeCount(): number;
        public setDefaultNodeLabel(newDefault: string): Graph<V, T>;
        public setDefaultEdgeLabel(newDefault: string): Graph<V, T>;
        public nodes(): Array<V>;
        public edges(): Array<T>;
        public sources(): Array<V>;
        public sinks(): Array<V>;
        public hasNodes(): boolean;
        public node(v: string): V;
        public setNode(v: string, value?: V): Graph<V, T>;
        public removeNode(v: string): Graph<V, T>;
        public predecessors(v: string): Array<string>;
        public successors(v: string): Array<string>;
        public neighbors(v: string): Array<string>;
        public inEdges(v: string, u?: string): Array<string>;
        public outEdges(v: string, u?: string): Array<string>;
        public nodeEdges(v: string, u?: string): Array<string>;
        public parent(v: string): string;
        public children(v: string): string;
        public setParent(v: string, parent: string): Graph<V, T>;
        public hasEdge(v: string, w: string, name?: any): boolean;
        public edge(v: string, w: string, name?: any): any;
        public setEdge(v: string, w: string, label?: any, name?: any): Graph<V, T>;
        public removeEdge(v: string, w: string): Graph<V, T>;
        public setPath(vs: Array<string>, value?: any): Graph<V, T>;
    }

    module json {
        function write(g: Graph<any, any>): string;
        function read(json: string) : Graph<any, any>;
    }

    module alg {
        function components(g: Graph<any, any>): Array<Array<string>>;
        function dijkstra(g: Graph<any, any>, source: string,
                          weightFn?: (edge : string) => number,
                          edgeFn?: (node : string) => Array<string>): any;
        function dijkstraAll(g: Graph<any, any>, weightFn?: (edge : string) => number,
                             edgeFn?: (node : string) => Array<string>): any;
        function findCycle(g: Graph<any, any>): Array<Array<string>>;
        function floydWashall(g: Graph<any, any>, weightFn?: (edge : string) => number,
                              edgeFn?: (node : string) => Array<string>): any;
        function isAcyclic(g: Graph<any, any>): boolean;
        function postorder(g: Graph<any, any>, vs: string | Array<string>): Array<string>;
        function preorder(g: Graph<any, any>, vs: string | Array<string>): Array<string>;
        function prim(g: Graph<any, any>, weightFn?: (edge : string) => number): Graph<any, any>;
        function trajan(g: Graph<any, any>): Array<Array<any>>;
        function topsort(g: Graph<any, any>): Array<string>;
    }
}

//declare module 'graphlib' {
//
//    var toExport = {
//        graph: Graphlib.Graph,
//        json: Graphlib.Json,
//        alg: Graphlib.Algorithms,
//        version: Graphlib.VERSION
//    }
//
//    export = toExport;
//}