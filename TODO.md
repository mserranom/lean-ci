TODO
====

M
==

[ ] move all typings import to index

[ ] fix _ids, saving returning an object and number/string issues

[ ] dependency_graphs should return Repository objects, not just repository names

[ ] fix Promise return types on interfaces (when/if TS allows that)

[ ] include d.ts file for chai-things

[ ] remove Q, use ES6 Promises only

[ ] check DB indexes


L
==

[ ] Errors on github are not properly managed, should have specific errors logged in the endpoint

[ ] github doesn't download the actual content of the buildfile, only the mock is implemented

[ ] BuildResultController might too slow to lookup for the pipeline belonging a given build

[ ] automate the send of 500 instead of a try/catch block in REST endpoints


XL
==

[ ] dependency graph should be updated when a build is requested, before scheduling builds

[ ] include exact commit information in builds inside a pipeline, not allowing HEAD

[ ] allow an option to run 2 build requests in one pipeline when sequential, and the 2nd not started yet

[ ] replace Mongo with SQL

[ ] transaction/race condition issues


NICE TO HAVE
============

[ ] replace logs with proper tool - winston?

[ ] make DependencyGraph and PipelineGraph immutables

[ ] unit test DependencyGraph.updateDependencies()



DONE
====

[x] remove issues of github as a singleton
[x] deleting a repo breaks the dependency graph
[x] create complex scenario for testing dependency graphs, extending addition_two_repositories.ts
[x] clearly separate Schemas from other data objects
[x] remove POST build endpoint, builds should start with a build request entry, a push, manual start or similar, and be managed by the pipeline
[x] repository.tingodbConnect(TINGODB_PATH, (err,db) as Promise and update tests with async
[x] npm shrinkwrap
[x] Consolidate names with Controller, BuildQueue, ...
[x] review TO DOs and create items in this list
[x] make sure non-connected graphs are allowed for dependency graphs, but not for pipelines
[x] dates in Build entity are probably not real now, since we have idle state. Should be fixed
[x] run app using sourcemap, while keeping the debug on IntelliJ
[x] migrate to ES6 straight export from TS, no babel
[x] migrate TSC 1.7
[x] adding repository to the pipeline should test the /pipelines endpoint
[x] remove pingURL from buildRequest/Build
