var testTimeout = 1000;
var testDuration = 2000;
describe("auth tests", function(){
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
        $scope.user.usernameLogin = 'test2';
        $scope.user.passwordLogin = 'me';
        var stub = sinon.stub(authFactory, "login", function(username, password) {
          assert(username === $scope.user.usernameLogin);
          assert(password === $scope.user.passwordLogin);
          done();
        });
        $scope.login();
        authFactory.login.restore();
      });
      it('should have a signup function which calls the signup service', function(done) {
        assert.isFunction($scope.signup);
        $scope.user = {};
        $scope.user.usernameSignup = 'test2';
        $scope.user.passwordSignup = 'me';
        var stub = sinon.stub(authFactory, "signup", function(username, password) {
          assert(username === $scope.user.usernameSignup);
          assert(password === $scope.user.passwordSignup);
          done();
        });
        $scope.signup();
        authFactory.signup.restore();
      });
    });
  });
  // TODO: test auth services
  describe('services', function () {
    var $scope = {};
    var controller;
    var $httpBackend;

    // Set appropriate controller
    beforeEach(function() {
      $scope = {};
      controller = $controller('authController', { $scope: $scope });
    });

    // Inject auth factory which we can spy
    var authFactory = {};
    beforeEach(inject(function(_authFactory_, $injector) {
      $httpBackend = $injector.get('$httpBackend');
      // var loginPageHandler = $httpBackend.when('GET', '/app/features/auth/login.html')
      //   .respond(200,'');
      // var authReqHandler = $httpBackend.when('POST', '/api/users/login')
      //   .respond('nate');
      authFactory = _authFactory_;
    }));

    describe('auth factory', function() {
      it('should have a login method which issues a POST request to /api/users/login', function(done) {
        expect(authFactory.login).to.be.a('function');

        $httpBackend.expectPOST('/api/users/login').respond(200,'nate');
        $httpBackend.expectGET('app/features/auth/login.html').respond(200,'');
        $httpBackend.expectGET('app/features/chat/chat.html').respond(200,'');

        // Issue login request
        this.timeout(testDuration);
        authFactory.login()
          .then(function(resp) {
            expect(resp.data).to.equal('nate');
            done();
          })
          .catch(function(err) {
            console.log('Error with auth factory login request', err);
          });
        $httpBackend.flush();
      });
      it('should have a getFriends method which issues a GET request to /api/users/username', function(done) {
        expect(authFactory.getFriends).to.be.a('function');

        var username = 'nate';
        var friends = ['livvie','kyle'];
        $httpBackend.expectGET('/api/users/'+username).respond(200,friends);
        $httpBackend.expectGET('app/features/auth/login.html').respond(200,'');
        $httpBackend.expectGET('app/features/chat/chat.html').respond(200,'');
        authFactory.getFriends(username)
          .then(function(resp) {
            expect(resp).to.deep.equal(friends);
            done();
          })
          .catch(function(err) {
            console.log('Error with auth factory get friends request', err);
          });
        $httpBackend.flush();
      });
      it('should have a logout method', function(done) {
        expect(authFactory.logout).to.be.a('function');
        done();
      });
      it('should have a signup method which issues a post request to /api/users/signup', function(done) {
        expect(authFactory.signup).to.be.a('function');
        var username = 'nate';
        var password = 'abcd';
        $httpBackend.expectPOST('/api/users/signup').respond(200,username);
        $httpBackend.expectGET('app/features/auth/login.html').respond(200,'');
        $httpBackend.expectGET('app/features/chat/chat.html').respond(200,'');
        authFactory.signup(username, password)
          .then(function(resp) {
            expect(resp.status).to.equal(200);
            expect(resp.data).to.equal(username);
            done();
          })
          .catch(function(resp) {
          });
        $httpBackend.flush();
      });
    });
  });
});
