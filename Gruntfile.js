module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-shell');
  
  grunt.initConfig({

    "shell": {
      mochaTest: {
        command: 'npm run mochaTest'
      },
      karmaTest: {
        command: 'npm run karmaTest'
      }
    }

  });

  // Run all tests once
  grunt.registerTask('test',function (n) {
    grunt.task.run([ 'shell:mochaTest', 'shell:karmaTest' ] );
  });

};
