angular.module('Locket.authFactory', [])

.factory('authFactory', function($http, $state){

  var login = function(username, password){
    return $http({
      method: 'POST',
      url: '/api/users/login',
      data: {username: username, password:password }
    }).then(function(resp){
      if (resp.status === 200) {
        $state.go('chat');
      }
      return resp;
    });

  };

  var logout = function(){
    return $http({
      method: 'GET',
      url: '/api/users/logout'
    }).then(function(resp){
      return resp;
    });
  };

  var signup = function(username, password){
    return $http({
      method: 'POST',
      url: '/api/users/signup',
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
