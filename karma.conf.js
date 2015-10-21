// Karma configuration
// Generated on Mon Sep 28 2015 19:49:28 GMT-0700 (PDT)

module.exports = function (config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'chai'],


    // list of files / patterns to load in the browser
    files: [
      "Client/bower_components/socket.io-client/socket.io.js",
      'Client/bower_components/angular/angular.js',
      'Client/bower_components/angular-mocks/angular-mocks.js',
      "Client/bower_components/angular-youtube-mb/dist/angular-youtube-embed.min.js",
      "Client/bower_components/angular-socket.io-mock/angular-socket.io-mock.js",
      "Client/bower_components/angular-scroll-glue/src/scrollglue.js",
      "Client/app.js",
      "Client/socket.js",
      "Client/Chat/chat.js",
      "Client/YouTube/youtube.js",
      'test/client/*.js'
    ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome', 'PhantomJS'],

    plugins: ['karma-mocha', 'karma-chai', 'karma-chrome-launcher', 'karma-phantomjs-launcher'],

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false
  });
};
