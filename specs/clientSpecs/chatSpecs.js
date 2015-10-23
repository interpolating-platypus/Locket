var testTimeout = 1000;
var testDuration = 2000;
describe("chat tests", function(){
  var mockEncryptionFactory = {
    generateKeyPair: function () {
      var keyring = {};
      var options = {
        numBits: 2048,
        userId: 'randomId',
        passphrase: 'randomPassphrase'
      };
      
      return openpgp.generateKeyPair(options)
      .then(function (keypair) {
        keyring.privkey = keypair.privateKeyArmored;
        keyring.pubkey = keypair.publicKeyArmored;
      }).then(function () {
        return keyring;
      }).catch(function (error) {
        // failure
      });
      // return {
      //   pubkey: '-----BEGIN PGP PUBLIC KEY BLOCK 12345 END PGP PUBLIC KEY BLOCK-----',
      //   privkey: '-----BEGIN PGP PRIVATE KEY BLOCK abcde END PGP PRIVATE KEY BLOCK-----'
      // };
    },
    encryptMessage: function (keyring, message) {
      // return message + keyring;
      var pubKey = keyring.pubkey;
      return openpgp.encryptMessage(openpgp.key.readArmored(pubKey).keys, message)
      .then(function (pgpMessage) {
        // console.log('encrypted message sent', pgpMessage);
        return pgpMessage;
      });
    },
    decryptMessage: function (keyring, pgpMessage) {
      // return pgpMessage - keyring;
      var privKey = keyring.privkey;
      var privateKey = openpgp.key.readArmored(privKey).keys[0];
      privateKey.decrypt(options.passphrase);
      pgpMessage = openpgp.message.readArmored(pgpMessage);

      return openpgp.decryptMessage(privateKey, pgpMessage).then(function (plaintext) {
        // console.log('decrypted message', plaintext);
        return plaintext;
      });
    }
  };
  beforeEach(module(function($provide) {
    $provide.value('encryptionFactory', mockEncryptionFactory);
  }));
  beforeEach(module('Locket'));
  beforeEach(module(function($urlRouterProvider) {
    $urlRouterProvider.deferIntercept();
  }));
  var $controller, socket;

  var authFactory = {};
  // var encryptionFactory = {};

  // Inject a fresh controller
  beforeEach(inject(function(_$controller_, _socket_, _authFactory_){
    $controller = _$controller_;
    socket = _socket_;
    authFactory = _authFactory_;
    // encryptionFactory = _encryptionFactory_;
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
      mockEncryptionFactory.generateKeyPair().then(function () {console.log('mock encryption factory')});
      $scope.activeFriend = {
        username: 'nate',
        key: '-----BEGIN PGP PUBLIC KEY BLOCK-----Version: OpenPGP.js v1.3.0Comment: http://openpgpjs.org xsBNBFYqupoBCAD67+4RzDQ9SjlUrPMc+gDxUikTWmfhIJZL0/C/odHa00yW+YyQ8Qf9m6ZXE7vrbGTcUHev5CVtYac2PiwakjoCTw/ZgMXidYjEFlcAJ9CHe9Y5BobsOj89zd11P8wgSM5ZeBCNU7fqT+od7++prQs57ydJdXacW92S+n5DHIbpIbtGb8+sKmyXG+n5Zs1C7YPWfJ8t13TC5SB/lsesxIyt62h/f6xzpsnLEEj7oEtr2OquHm3FSXtLsi6PmBcx8uLk1iJaqiuDNOyNhywPrbzrSp2SKXxqPcNWF5JlVrK1UHLIOFREHJhIUTHASKV3LzZD6FZchYkHAe2Y/9paqAOVABEBAAHNCHJhbmRvbUlkwsByBBABCAAmBQJWKrqbBgsJCAcDAgkQYfy0So7sTM0EFQgCCgMWAgECGwMCHgEAAF0ACAC8eCFjIMnuLlGaNE7GuHOLjLqftu3DDZY/5F9wA6SuGFYr4rvWGOKrve5rHpWErnRWa+PzEKYzFCd85eGC/9dks7P1Gctf2Rp8tCavx+B3Qs7ZaecmMIw9GZKCU0wARSRC5QMAX0xuv9bmiSqF/ZnQcmVJ9W+19ztjlUc9gTaPR6JvAJrn4eznDChM12d+x/4cCxlkEQ5O7HYVOpzNuAt5a/gJxth2jim0byjvfg80vztKUwOz4esE05cRJI4NafKbkr1EX/0y3an8vs/HSZbc92uJf1ccrvwwC2cPR/Huz40S+TdbbnjgnkjA6dV0F2+/0hkvHxqer7BjHk9ygVV7zsBNBFYqupoBCADCLDgzlDaf4j9MTCRMu1QKUf8DESHhpR/oGm+mFuVRnd7SNIdi49nKaYj/bJ8VqzxcMlyOsX6RNgIJy0SnUDwHykuzv0agKVURUf5zG5iBVhH3UgbUerGpGwuGUjrRUgjjSZDQKAdWhiRUDqcNlV0EitYA4QPTpOLct4yopUW5SZZgX2VYoarC3biamfUHHoqmu+f0qbYa0BLsVKApURvvMsVY7W9+f7bGBG/kUj2qAuPeWRwHcOzWJ8MP4JMgigwog4revuNzJxWnX/wa41m/6p7XPuADuGNnQLkKHp3mE7EfjJhtM9aOlqLZTmOdk990nLA6EeSBDq7sSroPiPZnABEBAAHCwF8EGAEIABMFAlYqupsJEGH8tEqO7EzNAhsMAAAB+ggA5y7BXCJepl2zTlUzwlPg3g0l+MbEOvdsUBALdS+VDELsPVQwFhJm63nSGhtZUr7E8Co2CKf3FlvfldDjKn+qQ9bfPRK/zXuHLvCGPXKEPILnrNZrV+q+niX+griBgwGOI69ovNkwted6ExfxVmrszIKzRa6Ww51sUq7dTJZGIb1QdUlUFeXz6kraaikIp82CuZFRItsqSoUsSvOBn/lkSsbp74e5PdTIT3GQKE9LGoNoQUsX8gKNwu9/jUKH7iSGOuKMD9Ed1vSMPzVKVu5V1++u+F4xjJZtpiofi6iJ4F0xaqk+SxXXCkTeYnoRJc/PMpnkh4oyatjKVn3hDQ8Y7w===2v6K-----END PGP PUBLIC KEY BLOCK-----'
      };
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
