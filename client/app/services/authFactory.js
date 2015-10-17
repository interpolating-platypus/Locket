angular.module('Locket.authFactory', [])

.factory('authFactory', function($http){

  var login = function(username, password){
    return $http({
      method: 'POST',
      url: '/login',
      data: {username: username, password:password }
    }).then(function(resp){
      return resp;
    });

  };

  var logout = function(){
    return $http({
      method: 'GET',
      url: '/logout'
    }).then(function(resp){
      return resp;
    });
  };

  var signup = function(username, password){
    return $http({
      method: 'POST',
      url: '/signup',
      data: {username: username, password:password }
    }).then(function(resp){
      return resp;
    });
  };

  return {
    login: login,
    logout: logout,
    signup: signup
  }


});
