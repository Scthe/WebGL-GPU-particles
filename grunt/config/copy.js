'use strict';

// Copies remaining files to places other tasks can use
module.exports = {
  assets: {
      expand: true,
      dot: true,
      cwd: '<%= app %>',
      dest: '<%= buildDir %>',
      src: [
        'images/*.{ico,png,gif,jpg}',
        '*.html',
        'vendor/**/*'
      ]
  },
  watchHtml: {
    cwd: '<%= app %>',
    dest: '.tmp/',
    src: [
      '*.html',
    ]
  },
  shaders: {
    cwd: 'src',
    dest: '<%= buildDir %>',
    expand: true,
    src: [
      'shaders/*.shader',
    ]
  },
  vendor: {
      expand: true,
      cwd: 'node_modules',
      dest: '<%= buildDir %>/vendor',
      src: [
        'underscore/underscore-min.js',
        'three/three.min.js',
        'q/q.js'
      ]
  }
};
