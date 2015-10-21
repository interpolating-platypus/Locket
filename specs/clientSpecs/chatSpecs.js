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
    it('should store the current user', function() {
    });
    it('should store a friends list', function() {
      expect($scope.friends).to.be.an.array;
    });
    it('should get friends from the server', function() {
    });
    it('should receive friend requests', function() {
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
    it('should store accepted friend requests', function() {
    });
    it('should store the friend currently being talked to', function() {
    });
    it('should be able to send messages to the active user', function(done) {
      // spy on the socket emit
      sinon.stub(socket, 'emit', function(eventName, obj) {
        expect(eventName).to.equal('sendMessage');
        expect(obj.to).to.equal('nate');
        expect(obj.message).to.equal('hi');
        done();
      });
      $scope.activeFriend = {username: 'nate'};
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
      setTimeout(function() {
        expect($scope.friends[0].messages).to.not.be.empty;
        done();
      }, 1000);
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
        setTimeout(function() {
          expect($scope.friends[0].online).to.equal(true);
          done();
        }, 1000);
      });
      it('should update when a friend logs out', function(done) {
        $scope.friends = [];
        $scope.friends.push({username: 'nate', online: true});
        socket.emit('echo', {
          name: 'friendLoggedOut',
          data: 'nate'
        });
        setTimeout(function() {
          expect($scope.friends[0].online).to.equal(false);
          done();
        }, 1000);
      });
    });
  });
});
