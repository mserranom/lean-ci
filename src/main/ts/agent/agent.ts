//"use strict";
//
//import {Stream} from 'stream';
//import * as fs from 'fs';
//
//import {git} from './git'
//import {model} from '../model'
//
//
//
//interface RepoInfo {
//    organisation : string;
//    name : string;
//}
//
//function parseRepoInfo(repoName : string) : RepoInfo {
//    let split = repoName.split('/');
//    return {
//        organisation : split[0],
//        name : split[1]
//    }
//}
//
//async function prepareRepo(repo : RepoInfo, commit : string) {
//
//}
//
//async function getBuildConfig(repo : RepoInfo) : Promise<model.BuildConfig> {
//
//}
//
//function runBuildCommands(repo : RepoInfo, commands : Array<string>) : Stream {
//    return null;
//}
//
//async function build(repoName : string, commit : string) {
//
//    let repo = parseRepoInfo(repoName);
//
//    await prepareRepo(repo, commit);
//
//    let buildConfig = await getBuildConfig(repo);
//
//    let out = runBuildCommands(repo, buildConfig.commands);
//
//    let fileStream = fs.createWriteStream('build-log-' + new Date().toUTCString() + '.txt');
//
//    out.pipe(fileStream);
//
//}
//
//
//git.doStuff();
//
///*
//
//    1. Checkout/clone the repo HEAD
//    2. run the command
//
//
//
//*/