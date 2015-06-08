module.exports = function (grunt) {

    "use strict";

    var project = {
        srcDir : 'src/main/ts',
        testDir : 'src/test/ts',
        targetDir : 'target',
        targetTestDir : 'target/test',
        name : '<%= pkg.name %>',
        version : '<%= pkg.version %>',
        extension : 'ts'
    };
    project.targetJs = project.targetDir + '/' + project.name + '-' + project.version + '.js';
    project.targetJsMin = project.targetDir + '/' + project.name + '-' + project.version + '.min.js';
    project.targetTestJs = project.targetTestDir + '/' + project.name + '-test-' + project.version + '.js';


    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        clean:{
            target:[ project.targetDir,'_SpecRunner.html', project.srcDir + '/**/*.js', project.srcDir + '/**/*.js.map',
                project.srcDir + '/**/*.html', project.testDir + '/**/*.js',  project.testDir + '/**/*.js.map',
                project.testDir + '/**/*.html' ]
        },

        typescript: {
            base: {
                src: [project.srcDir + '/*.ts'],
                dest: project.targetJs
            },
            test: {
                src: [project.testDir + '/*.ts'],
                dest: project.targetTestJs
            },
            options: {
                module: 'commonjs',
                target: 'ES5',
                basePath: project.srcDir,
                sourceMap: false,
                declaration: false
            }
        },


        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    captureFile: project.targetTestDir + '/results.txt', // Optionally capture the reporter output to a file
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: true // Optionally clear the require cache before running tests (defaults to false)
                },
                src: [project.testDir + '/*.js']
            }
        },

        watch: {
            scripts: {
                files: [project.srcDir + '/**/*.ts', project.testDir + '/**/*.ts'],
                tasks: ['test'],
                options: {
                    spawn: false
                }
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks('grunt-typescript');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-watch');

    grunt.registerTask("compile", ["clean", "typescript"]);
    grunt.registerTask("test", ["compile", "mochaTest"]);
    grunt.registerTask("default", ["test"]);

};