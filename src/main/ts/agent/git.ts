//"use strict";
//
//export module git {
//
//    let fs = require('fs-promise');
//    let nodegit = require('nodegit');
//    let path = require('path');
//
//    let HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
//    let REPOS_DIR = HOME + '/leanci-tmp/';
//    let GITHUB_URL = 'https://github.com/';
//
//
//    //async function createDir(path : string) : Promise<void> {
//    //   try {
//    //       await fs.mkdir(path);
//    //   } catch(error){
//    //       if (error.code != 'EEXIST') {
//    //           throw error;
//    //       }
//    //   }
//    //}
//    //
//    //async function createDir(path : string) : Promise<void> {
//    //    try {
//    //        await fs.mkdir(path);
//    //    } catch(error){
//    //        if (error.code != 'EEXIST') {
//    //            throw error;
//    //        }
//    //    }
//    //}
//
//    async function clone(repo : string) : Promise<void> {
//
//        var opts = {
//            ignoreCertErrors: 1,
//            remoteCallbacks: {
//                credentials: function(url, userName) {
//                    //return nodegit.Cred.userpassPlaintextNew('mserranom', 'PtKBdG83');
//                    return nodegit.Cred.sshKeyFromAgent(userName);
//                }
//            }
//        };
//
//
//        console.log('clonging ' + GITHUB_URL  + repo);
//        try {
//            var cloneRepository = await nodegit.Clone.clone("https://github.com/nodegit/nodegit", "/Users/miguel/.leanci/repoz", null)
//        } catch(error) {
//            console.error(error);
//        }
//
//
//        console.log('YEAH!');
//
//    }
//
//    //export async function checkout(repo : string, destination : string, commit? : string) : Promise<void> {
//    //
//    //    let repoName = repo.split('/')[1];
//    //
//    //    try {
//    //        await nodegit.Clone.clone(REPO_URL + repo, path, null);
//    //    }
//    //
//    //    var pathToRepo = path.resolve(repoName);
//    //
//    //    let repo = await nodegit.Repository.open(pathToRepo);
//    //
//    //    let stats = await fs.lstat(REPOS_DIR + '/' + repoName);
//    //    if(!stats.isDirectory()) {
//    //        return nodegit.Clone.clone(REPO_URL + repo, path, null);
//    //    } else {
//    //
//    //    }
//    //
//    //
//    //}
//
//    //export async function checkoutClean(branch : string, commit? : string) : Promise<void> {
//    //
//    //    commit = commit || 'HEAD';
//    //
//    //    return nodegit.Clone.clone(REPO_URL, null)
//    //}
//
//    //async function run(repo : string, commit : string, command : string) : Promise<void> {
//    //    await createDir(REPOS_DIR);
//    //}
//
//    export async function doStuff() : Promise<void> {
//        await clone('mserranom/leanci');
//    }
//
//}