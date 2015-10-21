angular.module('Locket.auth', [])

.controller('authController', function ($scope, authFactory) {
  $scope.loginFailed = false;
  $scope.signupFailed = false;

  $scope.login = function(){
    authFactory.login($scope.user.username, $scope.user.password);
  };

  $scope.signup = function(){
    authFactory.signup($scope.user.username, $scope.user.password);
  };

});
