'use strict';

module.exports = {
  options: {
    module: 'commonjs',
    target: 'es5',
    noEmitOnError: true,
    sourceMap: false,
    declaration: false,
    fast: 'never'
  },
  compileTs: {
    src: ['src/**/*.ts'],
    // out: '<%= buildDir %>/app.js',
    out: '.tmp/app.js',
  }
};
