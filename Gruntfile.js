module.exports = function (grunt) {

    "use strict";

    var project = {
        srcDir : 'src/main/ts',
        testDir : 'src/test/ts',
        targetDir : 'dist',
        targetTestDir : 'dist/ES5/src/test/ts',
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
                project.srcDir + '/**/*.d.ts', project.testDir + '/**/*.d.ts',
                project.srcDir + '/**/*.html', project.testDir + '/**/*.js',  project.testDir + '/**/*.js.map',
                project.testDir + '/**/*.html', 'dist.zip']
        },

        // Commented out, has problems to run with exclusions. replaced with shell:compile

        //ts: {
        //    options: {
        //        compiler: '/usr/local/bin/tsc'
        //    },
        //    default: {
        //        tsconfig: './tsconfig.json'
        //    }
        //},

        shell: {
            options: {
                stderr: false
            },
            compile: {
                command: 'tsc'
            }
        },

        mochaTest: {
            options: {
                reporter: 'spec',
                captureFile: project.targetDir + '/test-results.txt', // Optionally capture the reporter output to a file
                quiet: false, // Optionally suppress output to standard out (defaults to false)
                clearRequireCache: true // Optionally clear the require cache before running tests (defaults to false)
            },
            unit: {
                src: [project.targetTestDir + '/**/*.js', '!' + project.targetTestDir + '/**/integration/**/*.js']
            },
            integration: {
                src: [project.targetTestDir + '/**/integration/**/*.js']
            }
        },

        babel: {
            options: {
                sourceMap: true,
                experimental: true
            },
            dist: {
                files: [{
                    expand: true,
                    cwd: "dist/",
                    src: ["**/*.js"],
                    dest: "dist/ES5/",
                    ext: ".js"
                }]
            }
        },

        zip: {
            'dist.zip': ['dist/ES5/**/*', 'node_modules/**/*.*']
        },

        watch: {
            scripts: {
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

    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.loadNpmTasks('grunt-ts');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-zip');

    grunt.registerTask("compile", ["clean", "shell:compile", "babel"]);
    grunt.registerTask("test", ["compile", "mochaTest:unit", "mochaTest:integration"]);
    grunt.registerTask("package", ["test", "zip"]);
    grunt.registerTask("default", ["package"]);

    grunt.task.run('notify_hooks'); //requires 'brew install terminal-notifier'

};
