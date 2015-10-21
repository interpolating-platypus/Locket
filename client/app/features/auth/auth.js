angular.module('Locket.auth', [])

.controller('authController', function ($scope, authFactory) {
  $scope.loginFailed = false;
  $scope.signupFailed = false;

  $scope.login = function(){
    authFactory.login($scope.user.usernameLogin, $scope.user.passwordLogin);
    $scope.loginFailed = true;
  };

  $scope.signup = function(){
    authFactory.signup($scope.user.usernameSignup, $scope.user.passwordSignup);
    $scope.signupFailed = true;
  };

});
