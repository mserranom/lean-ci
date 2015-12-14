TODO
====

M
==

[ ] rename SchedulerProcessFake to DebugBuild

[ ] dependency_graphs should return Repository objects, not just repository names

[ ] migrate TSC 1.7

[ ]  repository.tingodbConnect(TINGODB_PATH, (err,db) as Promise and update tests with async

[ ] fix Promise return types on interfaces (when/if TS allows that)

L
==

[ ] create complex scenario for testing dependency graphs, extending addition_two_repositories.ts

[ ] clearly separate Schemas from other data objects

[ ] remove POST build endpoint, builds should start with a build request entry, a push, manual start or similar, and be managed by the pipeline

[ ] automate the send of 500 instead of a try/catch block in REST endpoints

[ ] migrate to ES6 straight export from TS, no babel

XL
==



NICE TO HAVE
============

[ ] replace logs with proper tool - winston?

[ ] remove hardcoded properties, such as using objects defining the fields that are relevant in a query



DONE
====