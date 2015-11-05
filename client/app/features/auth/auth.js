angular.module('Locket.auth', [])

.controller('authController', function ($scope, authFactory) {
  $scope.loginFailed = false;
  $scope.signupFailed = false;

  $scope.login = function(){
    authFactory.login($scope.user.usernameLogin, $scope.user.passwordLogin)
    .catch(function () {
      $scope.loginFailed = true;
    });
    $scope.user.usernameLogin = '';
    $scope.user.passwordLogin = '';
  };

  $scope.signup = function(){
    authFactory.signup($scope.user.usernameSignup, $scope.user.passwordSignup)
    .catch(function () {
      $scope.signupFailed = true;
    });
    $scope.user.usernameSignup = '';
    $scope.user.passwordSignup = '';
    $scope.user.passwordConfirm = '';
  };

});
