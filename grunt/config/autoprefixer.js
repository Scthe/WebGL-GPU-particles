'use strict';

var files = [{
  expand: true,
  cwd: '<%= buildDir %>/styles/',
  src: '{,*/}*.css',
  dest: '<%= buildDir %>/styles/'
}];

// Add vendor prefixed styles
module.exports = {
  options: {
    browsers: ['last 1 version']
  },
  dist: {
    options: {
      map: true,
    },
    files: files
  },
  build: {
    files: files
  }
};
