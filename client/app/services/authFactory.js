angular.module('Locket.authFactory', [])

.factory('authFactory', function ($http, $state) {

  var signedin = function() {
    
    return $http({
      method: 'GET',
      url: '/api/users/signedin'
    }).then(function(resp) {
      if(resp.data.auth === "UNAUTHORIZED"){
        $state.go('login');
      }
      return resp.data;
    });

  };

  var login = function(username, password){
    return $http({
      method: 'POST',
      url: '/api/users/login',
      data: { username: username, password: password }
    }).then(function(resp){
      if (resp.status === 200) {
        $state.go('chat', resp.data);
      }
      return resp;
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
        login(username, password);
      }
      return resp;
    });
  };

  return {
    signedin: signedin,
    login: login,
    logout: logout,
    signup: signup
  };

});
