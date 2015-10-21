describe("chat tests", function(){
  beforeEach(module('Locket'));
  var $controller, authFactory;

  // Inject a fresh controller
  beforeEach(inject(function(_$controller_){
    $controller = _$controller_;
  }));
  
  // Inject auth factory
  var authFactory = {};
  beforeEach(inject(function(_authFactory_) {
    authFactory = _authFactory_;
  }));

  describe('Chat controller', function() {
    beforeEach(function() {
      $scope = {};
      controller = $controller('chatController', { $scope: $scope });
    });
    it('should store the current user', function() {
    });
    it('should store a friends list', function() {
    });
    it('should get friends from the server', function() {
    });
    it('should store friend requests', function() {
    });
    it('should store accepted friend requests', function() {
    });
    it('should store the friend currently being talked to', function() {
    });
    it('should be able to send messages', function() {
    });
    describe('Message Receiving', function() {
      it('should be able to receive messages from the active user', function() {
      });
      it('should be able to receive messages from other users', function() {
      });
    });
    it('should be able to add friends', function() {
    });
    it('should be able to accept friend requests', function() {
    });
    it('should be able to ignore friend requests', function() {
    });
    it('should be able to acknowledge friend requests', function() {
    });
    describe('Friends List', function() {
      it('should update when a friend logs in', function() {
      });
      it('should update when a friend logs out', function() {
      });
    });
  });
});
