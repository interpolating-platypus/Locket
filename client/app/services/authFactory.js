angular.module('Locket.authFactory', [])

.factory('authFactory', function($http, $state){

  // var signedin = function(currentUser) {
  //   if (!currentUser) {
  //     $state.go('login');
  //   } else {
  //     $state.go('chat');
  //   }
  // };

  var login = function(username, password){
    return $http({
      method: 'POST',
      url: '/api/users/login',
      data: { username: username, password: password }
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
      // console.log('data', resp.data);
      return resp.data;
    });
  };


  var logout = function(){
    $state.go('login');
  };

  var signup = function(username, password){
    return $http({
      method: 'POST',
      url: '/api/users/signup',
      data: { username: username, password:password }
    }).then(function(resp){
      if (resp.status === 200) {
        $state.go('chat', {currentUser: resp.data});
      }
      return resp;
    });
  };

  return {
    // signedin: signedin,
    login: login,
    logout: logout,
    signup: signup,
    getFriends: getFriends
  };


});
