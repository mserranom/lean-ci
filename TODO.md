TODO
====

[ ] build log and status, check by build id

[ ] show build status and build log in UI

[ ] publish to Nexus

[ ] write acceptance tests for the services implemented so far

[ ] agent timeout after 4' makes the build fail and proceed with the queue

[ ] move the app to stateless, removing completely AllProjects model

[ ] move all services to authenticated, listing only data relevant to the given user

[ ] when adding and removing repos, webhooks must be added/removed too

[ ] a successful build triggers another build if it's a downstream dependency

[ ] finish continuous deployment pipeline for lean-ci
 * builds the whole pipeline and run builds to deploy to agents
 * deploys are versioned and the result is pushed to a branch

[ ] BUG: building a project with dependencies that are not projects in the model make the dependency resolution fail

[ ] extract class per file

[ ] decide strategies for queuing builds after the pipeline graph
 * create a pipeline datatype
 * queue builds based on the pipeline after builds finish
 * decide queueing strategie(s)

[ ] repositories: log errors, reject promises with meaningful messages


DONE
====

[x] ability to define a file (or file pattern) and upload to/ download from to Nexus

[x] ability to add, remove and list repositories for a given user

[x] ability to login with a github token
 * login in the cli, save the token and call an authenticated /ping
 * logout in the cli
 * ping
 * set unique ids for credentials in mongodb and allow to update credentials with new tokens

[x] Save past builds in DB (mongoDB?)
 * past build reports are taken from DB
 * return paged past builds sort by date

[x] resolve agent security and ssh
 * use secure ssh communications
 * check if root usage in agent is safe
 * or use http server to activate the agent

[x] UI for active builds, build queue and past builds
 * data is in memory only

[x] setup npm repository for builds

[x] make sure we're checking out the latest commit triggering the hook or we can specify the commit from github

[x] fix security / config issues

[x] fix dependencies vs devDependencies

[x] remove ssh keys and add URLs and ports to config

[x] make sure we're killing the terminal after the build

[x] take dependency chain from build repos definition
 * all repos included build and read a config file, establishing a dependency chain
 * the dependency chain is on sync with the repos
 * A and B build, the dependency chain is stablished for B. Then, if B is built, it should trigger A
 * unit tests for AllProject and BuildScheduler

[x] rest api to check active builds, build queue and past builds
 * each build is assigned an id (repo + commit)
 * status of each build is saved in memory (only running/finished so far)

[x] build dependency chain
 * there's a predefined dependency between 2 modules A and B
 * when A build finishes, B immediately starts

[x] queue of scheduled builds
 * only one build concurrent, the others are scheduled

[x] create endpoint to force a build to start
 * payload should include the full name of the repo to build

[x] monitor pushes and builds on lean-ci
 * running the script on a terminal permanently
 * subscribes to hooks in github repo to build when a change is pushed, printing logs

[x] clean up previous work and make it reliable (errors, long streams)

[x] build lean-ci repo in terminal agent
 * single script that can be run locally
 * creates an agent in terminal.com
 * asks the agent to checkout the project and build it
 * prints the build log
 * kills the agent
