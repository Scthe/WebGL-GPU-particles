'use strict';

// Watches files for changes and runs tasks based on the changed files
module.exports = {
  js: {
    // files: ['<%= config.app %>/src/{,*/}*.js'],
    files: ['src/**/*.ts'],
    tasks: ['ts']
  },
  index: {
    files: ['*.html'],
    tasks: ['copy:watchHtml']
  },
  shaders: {
    files: ['src/**/*.shader'],
    tasks: ['copy:shaders']
  },
};
