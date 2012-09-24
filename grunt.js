/*global module:false*/
module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    meta: {
      version: '0.1.0',
      banner: '/*! Rolling Jubilee - v<%= meta.version %> - ' +
        '<%= grunt.template.today("yyyy-mm-dd") %>\n' +
        '* http://rollingjubilee.org/\n' +
        '* Copyright (c) <%= grunt.template.today("yyyy") %> ' +
        'Chris Contolini; Licensed MIT */'
    },
    cssmin: {
      dist: {
        src: ['<banner:meta.banner>', 'assets/css/bootstrap.css', 'assets/css/rj.css'],
        dest: 'assets/css/rj.min.css'
      }
    },
    min: {
      dist: {
        src: ['<banner:meta.banner>', 'assets/js/miso.ds.deps.min.0.2.2.js', 'assets/js/handlebars-1.0.rc.1.js', 'assets/js/fancybox/jquery.fancybox.pack.js', 'assets/js/fancybox/helpers/jquery.fancybox-media.js', 'assets/js/bootstrap.min.js', 'assets/js/rj.js'],
        dest: 'assets/js/rj.min.js'
      }
    },
    watch: {
      files: ['assets/css/bootstrap.css', 'assets/css/rj.css', 'assets/js/miso.ds.deps.min.0.2.2.js', 'assets/js/handlebars-1.0.rc.1.js', 'assets/js/fancybox/jquery.fancybox.pack.js', 'assets/js/fancybox/helpers/jquery.fancybox-media.js', 'assets/js/bootstrap.min.js', 'assets/js/rj.js'],
      tasks: 'default'
    }
  });

  grunt.loadNpmTasks('grunt-css');

  // Default task.
  grunt.registerTask('default', 'min cssmin');

};
