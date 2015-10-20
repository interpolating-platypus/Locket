angular.module('Locket.authFactory', [])

.factory('authFactory', function($http, $state){
  var auth = {};

  var login = function(username, password){
    return $http({
      method: 'POST',
      url: '/api/users/login',
      data: {username: username, password:password }
    }).then(function(resp){
      if (resp.status === 200) {
        $state.go('chat', {currentUser: resp.data});
      } 
      return resp;
    });
  };

  var getFriends = function(username) {
    return $http({
      method: 'GET',
      url: '/api/users/' + username,
    }).then(function(resp) {
      return resp.data.friends;
    });
  };


  var logout = function(){
    $state.go('login');

    //do we need to issue get request to API for logout? 
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
      if (resp.status === 200) {
        $state.go('chat');
      }
      return resp;
    });
  };

  return {
    login: login,
    logout: logout,
    signup: signup,
    getFriends: getFriends
  };


});
