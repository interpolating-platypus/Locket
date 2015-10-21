describe("client tests", function(){
  // Before each test, create fresh locket module
  beforeEach(module('Locket'));
  var $controller, authFactory;

  // Inject a fresh controller
  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));
  describe('features', function() {
    var $scope = {};
    var controller;

    // Set appropriate controller
    beforeEach(function() {
      $scope = {};
      controller = $controller('authController', { $scope: $scope });
    });

    // Inject auth factory which we can spy
    var authFactory = {};
    beforeEach(inject(function(_authFactory_) {
      authFactory = _authFactory_;
    }));

    describe('auth', function() {
      it('should have a login function which calls the login service with the correct username and password', function(done) {
        assert.isFunction($scope.login);
        $scope.user = {};
        $scope.user.username = 'test2';
        $scope.user.password = 'me';
        var stub = sinon.stub(authFactory, "login", function(username, password) {
          assert(username === $scope.user.username);
          assert(password === $scope.user.password);
          done();
        });
        $scope.login();
        authFactory.login.restore();
      });
      it('should have a signup function which calls the signup service', function(done) {
        assert.isFunction($scope.signup);
        $scope.user = {};
        $scope.user.username = 'test2';
        $scope.user.password = 'me';
        var stub = sinon.stub(authFactory, "signup", function(username, password) {
          assert(username === $scope.user.username);
          assert(password === $scope.user.password);
          done();
        });
        $scope.signup();
        authFactory.signup.restore();
      });
    });
  });
  // TODO: test auth services
});
