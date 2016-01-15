module.exports = function (grunt) {

    "use strict";

    var project = {
        srcDir : 'src/main/ts',
        testDir : 'src/test/ts',
        targetDir : 'dist',
        targetTestDir : 'dist/src/test/ts',
        name : '<%= pkg.name %>',
        version : '<%= pkg.version %>',
        extension : 'ts'
    };

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        clean:{
            target:[ project.targetDir,'_SpecRunner.html', project.srcDir + '/**/*.js', project.srcDir + '/**/*.js.map',
                project.srcDir + '/**/*.d.ts', project.testDir + '/**/*.d.ts',
                project.srcDir + '/**/*.html', project.testDir + '/**/*.js',  project.testDir + '/**/*.js.map',
                project.testDir + '/**/*.html', 'dist.zip']
        },

        ts: {
            options: {
                fast: 'never'
            },
            default: {
                tsconfig: './tsconfig.json'
            }
        },

        mochacli: {

            options: {
                reporter:  'spec',
                bail: true,
                'reporter-options': {output: project.targetDir + '/test-results.txt' }, // Optionally capture the reporter output to a file
                quiet: false, // Optionally suppress output to standard out (defaults to false)
                flags: ['--harmony']
            },
            unit: {
                options : {
                    files : [project.targetTestDir + '/**/*.js', '!' + project.targetTestDir + '/**/integration/**/*.js',
                                                                 '!' + project.targetTestDir + '/**/e2e/**/*.js']
                }
            },
            integration: {
                options : {
                    files : [project.targetTestDir + '/**/integration/**/*.js']
                }
            },
            e2e: {
                options : {
                    files : [project.targetTestDir + '/**/e2e/**/*.js']
                }
            }
        },

        zip: {
            'dist.zip': ['dist/**/*', 'src/main/**/*.ts', 'node_modules/**/*.*']
        },

        watch: {
            compile: {
                files: [project.srcDir + '/**/*.ts', project.testDir + '/**/*.ts'],
                tasks: ['compile'],
                options: {
                    spawn: true
                }
            },
            test: {
                files: [project.srcDir + '/**/*.ts', project.testDir + '/**/*.ts'],
                tasks: ['test'],
                options: {
                    spawn: true
                }
            }
        },

        notify_hooks: {
            options: {
                enabled: true,
                max_jshint_notifications: 2, // maximum number of notifications from jshint output
                title: '<%= pkg.name %>', // defaults to the name in package.json, or will use project directory's name
                success: true, // whether successful grunt executions should be notified automatically
                duration: 3 // the duration of notification in seconds, for `notify-send only
            }
        }
    });

    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-mocha-cli');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask("compile", ["clean", "ts"]);
    grunt.registerTask("test", ["compile", "mochacli:unit", "mochacli:integration", "mochacli:e2e"]);
    grunt.registerTask("package", ["test", "zip"]);
    grunt.registerTask("default", ["package"]);

    grunt.task.run('notify_hooks'); //requires 'brew install terminal-notifier'

};
