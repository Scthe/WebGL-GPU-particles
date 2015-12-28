'use strict';

// The actual grunt server settings
module.exports = {
  options: {
      hostname: 'localhost',
      port: 9000
  },
  dist: {
    options: {
      open: false,
      base: '<%= buildDir %>',
      // keepalive: true,
      livereload: false
    }
  }
};
