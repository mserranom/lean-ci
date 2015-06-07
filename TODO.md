TODO
====
[ ] monitor pushes and builds on lean-ci
 * running the script on a terminal permanently
 * subscribes to hooks in github repo to build when a change is pushed, printing logs

[ ] queue of scheduled builds
 * only one build concurrent, the others are scheduled
 
[ ] build dependency chain
 * there's a predefined dependency between 2 modules A and B
 * when A build finishes, B immediately starts
 
[ ] take dependency chain from build repos definition
 * all repos included build and read a config file, establishing a dependency chain
 * the dependency chain is on sync with the repos
 * A and B build, the dependency chain is stablished for B, and when it finishes, it builds B

[ ] setup Artifactory
 * setup an installation on terminal
 * setup aws account and S3, configure Artifatory with that S3
 * upload lean-ci in npm form to artifactory
 
 [ ] write integration tests for the services implemented so far
 * explore test framework options (mocha? https://github.com/pghalliday/grunt-mocha-test)
 
 
DONE
====
[x] clean up previous work and make it reliable (errors, long streams)

[x] build lean-ci repo in terminal agent
 * single script that can be run locally
 * creates an agent in terminal.com
 * asks the agent to checkout the project and build it
 * prints the build log
 * kills the agent

 
 