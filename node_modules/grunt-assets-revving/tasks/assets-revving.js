/*
 * grunt-assets-revving
 * https://github.com/contolini/grunt-assets-revving
 *
 * Copyright (c) 2012 Chris Contolini
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  var fs = require('fs'),
      async = grunt.util.async;

  grunt.registerMultiTask('rev', 'Assets revving task for Grunt', function() {

    var options = this.data,
        files = grunt.file.expandFiles(options.files),
        found = false,
        time = new Date().getTime();

    async.forEach(files, function(filename, next) {

      var file = grunt.file.expand(filename),
          lines = grunt.file.read(file).split(/\r\n|\r|\n/);

      var assetPattern = /(style|script)(.*)['"=]([^?*:;{}\\]+\.(css|js))(\?\d*)?['">]/i,
          assetFileName = /([^'"=?*:;{}\\]+\.(css|js))(\?\d*)?/;

      lines.forEach(function(el, index, array){
        if (el.match(assetPattern) && !el.match("//")) {
          lines[index] = el.replace(assetFileName, "$1?" + time);
          grunt.log.writeln("Revved " + el.match(assetFileName)[1].yellow + ' in ' + filename.cyan);
          found = true;
        }
      });

      if (found) {
        file = lines.join("\n");
        grunt.file.write(filename, file);
      }

      next();

    });

  });

};