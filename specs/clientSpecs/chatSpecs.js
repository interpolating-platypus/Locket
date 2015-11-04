var testTimeout = 1000;
var testDuration = 2000;
describe("chat tests", function(){
  beforeEach(module('Locket'));
  beforeEach(module(function($urlRouterProvider) {
    $urlRouterProvider.deferIntercept();
  }));
  var $controller, authFactory, socket;

  // Inject a fresh controller
  beforeEach(inject(function(_$controller_, _socket_){
    $controller = _$controller_;
    socket = _socket_;
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
    it('should get friends from the server', function(done) {
      $scope.currentUser = 'nate';
      sinon.stub(authFactory, 'getFriends', function(username) {
        expect(username).to.equal($scope.currentUser);
        done();
      });
      $scope.getFriends();
      authFactory.getFriends.restore();
    });
    it('should receive friend requests', function(done) {
      $scope.friendRequests = [];
      socket.emit('echo', {
        name: 'friendRequest',
        data: { from: 'kyle' }
      });
      this.timeout(testDuration);
      setTimeout(function() {
        expect($scope.friendRequests).to.not.be.empty;
        done();
      }, testTimeout);
    });
    it('should be able to accept friend requests', function() {
      var newFriend = {
        service: "Locket",
        username: 'nate',
        name: 'nate daawwggg',
        newMessage: false,
        online: true,
        messages:[]
      };
      $scope.friends = [];
      $scope.friendRequests.push(newFriend);
      $scope.acceptFriendRequest(newFriend);
      expect($scope.friends).to.not.be.empty;
      expect($scope.friendRequests).to.be.empty;
    });
    it('should be able to send messages to the active user', function(done) {
      // spy on the socket emit
      sinon.stub(socket, 'emit', function(eventName, obj) {
        expect(eventName).to.equal('sendMessage');
        expect(obj.to).to.equal('nate');
        expect(obj.message).to.equal('hi');
        done();
      });
      $scope.activeFriend = {username: 'nate', service: "Locket"};
      $scope.sendMessage('hi');
      socket.emit.restore();
    });
    it('should be able to receive messages', function(done) {
      $scope.friends.push({username: 'nate', messages: []});
      var sampleMessage = {
        from: 'nate',
        to: 'livvie',
        message: 'hi',
        timestamp: Date.now()
      };
      socket.emit('echo', {
        name: 'newMessage',
        data: sampleMessage 
      });
      this.timeout(testDuration);
      setTimeout(function() {
        expect($scope.friends[0].messages).to.not.be.empty;
        done();
      }, testTimeout);
    });
    it('should be able to add friends', function(done) {
      var username = 'livvie';
      sinon.stub(socket, 'emit', function(eventName, obj) {
        expect(eventName).to.equal('addFriend');
        expect(obj.to).to.equal(username);
        done();
      });
      $scope.addFriend(username);
      socket.emit.restore();
    });
    it('should be able to accept friend requests', function(done) {
      $scope.friends = [];
      $scope.friendRequests = ['kyle'];
      sinon.stub(socket, 'emit', function(eventName, obj) {
        expect(eventName).to.equal('friendRequestAccepted');
        expect(obj.to).to.equal('kyle');
        done();
      });
      $scope.acceptFriendRequest('kyle');
      expect($scope.friends).to.not.be.empty;
      expect($scope.friendRequests).to.be.empty;
    });
    it('should be able to ignore friend requests', function() {
      $scope.friendRequests = ['kyle'];
      $scope.ignoreFriendRequest('kyle');
      expect($scope.friendRequests).to.be.empty;
    });
    it('should be able to acknowledge friend requests', function() {
      $scope.acceptedfriendRequests = ['kyle'];
      $scope.acknowledgeFriendRequest(0);
      expect($scope.acceptedFriendRequests).to.be.empty;
    });
    it('should be able to logout', function() {
      $scope.currentUser = 'nate';
      $scope.logout();
      expect($scope.currentUser).to.equal(null);
    });
    describe('Friends List', function() {
      beforeEach(function() {
        $scope.friends = [];
        $scope.friends.push({username: 'nate'});
      });
      it('should update when a friend logs in', function(done) {
        socket.emit('echo', {
          name: 'friendLoggedIn',
          data: 'nate'
        });
        this.timeout(testDuration);
        setTimeout(function() {
          expect($scope.friends[0].online).to.equal(true);
          done();
        }, testTimeout);
      });
      it('should update when a friend logs out', function(done) {
        $scope.friends = [];
        $scope.friends.push({username: 'nate', online: true});
        socket.emit('echo', {
          name: 'friendLoggedOut',
          data: 'nate'
        });
        this.timeout(testDuration);
        setTimeout(function() {
          expect($scope.friends[0].online).to.equal(false);
          done();
        }, testTimeout);
      });
    });
  });
});
