TODO
====
 
[ ] rest api to check active builds, build queue and past builds
 * each build is assigned an id (repo + commit)
 * status of each build is saved in memory (only running/finished so far)
 
[ ] take dependency chain from build repos definition
 * all repos included build and read a config file, establishing a dependency chain
 * the dependency chain is on sync with the repos
 * A and B build, the dependency chain is stablished for B, and when it finishes, it builds B

[ ] setup npm repository for builds

[ ] UI for active builds, build queue and past builds
 * data is in memory only

[ ] finish continuous deployment pipeline for lean-ci
 * builds the whole pipeline and run builds to deploy to agents

[ ] Save past builds in DB (mongoDB?)
 * past build reports are taken from DB

[ ] write integration tests for the services implemented so far
 * explore test framework options (mocha? https://github.com/pghalliday/grunt-mocha-test)

[ ] resolve agent security and ssh
 * use secure ssh communications
 * check if root usage in agent is safe
 * or use http server to activate the agent

[ ] identify pipeline triggered by a build
 
 
DONE
====

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
