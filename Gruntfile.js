module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-nodemon');

  
  grunt.initConfig({

    "shell": {
      mochaTest: {
        command: 'npm run mochaTest'
      },
      karmaTest: {
        command: 'npm run karmaTest'
      }
    },
    "nodemon": {
       dev: {
         script: 'server/server.js'
       }
     }
  });


  grunt.registerTask('runServer', function () {
    var nodemon = grunt.util.spawn({
             cmd: 'grunt',
             grunt: true,
             args: 'nodemon'
        });
  });

  // Run all tests once
  grunt.registerTask('test',function (n) {
    grunt.task.run([ 'shell:mochaTest' ]);
    grunt.task.run([ 'runServer' ]);
    grunt.task.run([ 'shell:karmaTest' ]);
  });

};
