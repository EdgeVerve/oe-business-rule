/**
 *
 * ©2018-2019 EdgeVerve Systems Limited (a fully owned Infosys subsidiary),
 * Bangalore, India. All Rights Reserved.
 *
 */

module.exports = function GruntConfig(grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    testFiles: 'test/*.spec.js',

    clean: {
      coverage: {
        src: ['coverage/']
      },
      dist: {
        src: ['dist/']
      }
    },

    mocha_istanbul: {
      coverage: {
        src: '<%= testFiles %>',
        options: {
          timeout: 60000,
          check: {
            lines: 30,
            statements: 30,
            branches: 30,
            functions: 30
          },
          reportFormats: ['lcov'],
          mochaOptions: ['--exit']
        }
      }
    }
  });

  // Add the grunt-mocha-test tasks.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mocha-istanbul');

  grunt.registerTask('test-with-coverage', ['clean:coverage', 'mocha_istanbul']);
};
