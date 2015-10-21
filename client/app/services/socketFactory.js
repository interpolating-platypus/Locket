angular.module('Locket.socketFactory', [])
.factory('socket', function ($rootScope) {
   var socket;
   if (window.__karma__) {
     socket = io.connect(window.location.protocol + "//" + window.location.hostname + ":" + 1337, {forceNew: true});
   } else {
     socket = io.connect({forceNew: true});
   }
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };
});
