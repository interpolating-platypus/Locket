angular.module('Locket.chat', ['luegg.directives', 'ngAnimate'])

.controller('chatController', function ($scope, authFactory, $stateParams, socket, encryptionFactory, $timeout) {
  authFactory.signedin().then(function(resp){
    if (resp === 'OK') {
      socket.connect();

      window.onbeforeunload = function(event){
        return "All of your messages will be lost";
      };

      var keyring = encryptionFactory.generateKeyPair();
      var publicKey;
      // send public key to friends on login
      keyring.then(function (keypair) {
        publicKey = keypair.pubkey;
        socket.emit('sendPGP', keypair.pubkey);
      });

      $scope.currentUser = $stateParams.username;
      $scope.friends = [];
      $scope.sentRequest = false;

      function createFriendObj(username, online, name, service) {
        return {
          service: service || 'Locket',
          username: username,
          name: name || (username + ' daawwggg'),
          unreadMessage: false,
          online: online || false,
          key: null,
          messages: [],
          unsentMessages: [] // added this in for revoke and show decrypted message for sender
        };
      }

      // Listen for events from our extension
      window.addEventListener('message', function(event) {
        console.log('client side message: ', event.data);
        if (event.source != window)
          return;

        // Recieve a facebook friends list
        if (event.data.type && (event.data.type === 'facebookFriendsList')) {
          console.log(event.data);
          for (var i = 0; i < event.data.text.length; i++) {
            var friend = event.data.text[i];
            var friendObj = createFriendObj(friend.username, true, friend.name, "Facebook");
            console.log('friendo',friendObj);
            $scope.friends.push(friendObj);
          }
          // After receiving a facebook friends list, begin monitoring the facebook DOM
          window.postMessage({ type: 'scanFacebookDOM', text: ''}, '*');
        }

        // Receive new facebook message(s)
        if (event.data.type && (event.data.type === 'receivedNewFacebookMessage')) {
          var username = event.data.text.with;
          var newMessages = event.data.text.text;
          findFriend(username, function(index) {
            if (index !== -1) {
              for (var i = 0; i < newMessages.length; i++) {
                $scope.friends[index].messages.push({
                  to: (event.data.text.from === 'me') ? event.data.text.with : $scope.currentUser,
                  from: (event.data.text.from === 'me') ? $scope.currentUser : event.data.text.with,
                  timestamp: Date.now(),
                  message: newMessages[i]
                });
                if ($scope.activeFriend && $scope.friends[index].username !== $scope.activeFriend.username) {
                  $scope.friends[index].unreadMessage = true;
                }
              }
            }
          });
        };

        // Receive a request for our PGP key
        if (event.data.type && (event.data.type === 'requestPublicKey')) {
          if (publicKey) {
            window.postMessage({ type: 'sendPublicKey', text: publicKey}, '*');
          } else {
            console.log("This statement only gets called if we have a request for a public key before it's generated. If you see this, add that capability");
          }
        }
        $scope.$apply();
        console.log('FRIENDS LIST:',$scope.friends);
      });

      $scope.requestEncryptedChat = function() {
        window.postMessage({ type: 'requestPublicKey', text: {
          key: publicKey,
          from: '????'
        }, '*');
      };


      $scope.friendRequests = [];
      $scope.acceptedfriendRequests = [];

      //represents the user selected in the friends list
      $scope.activeFriend = null;

      //messaging
      $scope.startChat = function(friend){
        findFriend(friend.username, function(index){
          $scope.activeFriend = $scope.friends[index];
          if ($scope.friends[index].unreadMessage) {
            $scope.friends[index].unreadMessage = false;
          }
          $timeout(function() {
            angular.element(".sendMessageInput").focus();
          }, 100);
        });
      };
        //if $scope.friends[username] has publicPGPKey
          //update chat view with current conversation
        //else
          //if $scope.friends[username].service is us
            //render messages in chat view
          //else if username.service isnt us
            //allow unencrypted chat
            //show red encryption symbol/button (warning user chat is not secure)

      $scope.sendMessage = function(messageText){
        //reset message text
        $scope.messageText = '';

        if ($scope.activeFriend.service === 'Locket') {
          // encrypt typed message
          encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, messageText)
          .then(function (encryptedMessage) {
            $scope.activeFriend.unsentMessages.push({message: messageText, encryptedMessage: encryptedMessage});
            socket.emit('sendMessage', { to: $scope.activeFriend.username, message: encryptedMessage });
          });
        } else if ($scope.activeFriend.service === 'Facebook') {
          console.log('posting message to facebook');
          window.postMessage({ type: 'sendFacebookMessage', to: $scope.activeFriend.username, text: messageText}, '*');
        }

        //if service is us
          //if we have recipients pgp key
            //encrypt and send message
          //else
            //notify user you are requesting recipient's pgp key
            //socket.emit('requestKey', {to: recipient})
        //else
          //request other user's public key and save message contents to be encrypted on receipt of user's key 
            //user would like to have an encrypted conversation with you:
            //user's public key
      };

      $scope.revokeMessage = function(message) {
        if (message.from === $scope.currentUser) {
          socket.emit('revokeMessage', {to: message.to, from: message.from, message: message.encryptedMessage, timestamp: message.timestamp});
        }
      };

      socket.on('receivePGP', function (keyObj) {
        findFriend(keyObj.friend, function (index) {
          if (index !== -1) {
            $scope.friends[index].key = keyObj.key;
            socket.emit('returnPGP', {friend: keyObj.friend, key: publicKey});
          }
        });
      });

      socket.on('completePGP', function (keyObj) {
        findFriend(keyObj.friend, function (index) {
          if (index !== -1) {
            $scope.friends[index].key = keyObj.key;
            console.log('key exchange complete');
          }
        });
      });

      socket.on('newMessage', function(message){
        findFriend(message.from, function(index){
          if (index !== -1) {
            // newMessageFrom = $scope.friends[index];
            // decrypt message
            keyring.then(function (keypair) {
              encryptionFactory.decryptMessage(keypair, message.encryptedMessage)
              .then(function (decryptedMessage) {
                message.message = decryptedMessage;
                $scope.friends[index].messages.push(message);
                $scope.$apply();
              });
            });
            if ($scope.activeFriend === null || $scope.friends[index].username !== $scope.activeFriend.username) {
              $scope.friends[index].unreadMessage = true;
            }
          }
        });
      });

      socket.on('messageSent', function (message) {
        findFriend(message.to, function (index) {
          if (index !== -1) {
            // $scope.friends[index].messages.push(message);
            // iterate through unsent messages to find the message
            for (var i = 0; i < $scope.friends[index].unsentMessages.length; i++) {
              if ($scope.friends[index].unsentMessages[i].encryptedMessage === message.encryptedMessage) {
                message.message = $scope.friends[index].unsentMessages[i].message;
                $scope.friends[index].unsentMessages.splice(i, 1);
                $scope.friends[index].messages.push(message);
              }
            }
          }
        });
      });

      socket.on('destroyMessage', function (message) {
        var friend;
        if (message.from === $scope.currentUser) {
          friend = message.to;
        } else {
          friend = message.from;
        }
        findFriend(friend, function (index) {
          if (index !== -1) {
            var messageIndex = -1;
            // iterate through messages to find one that matches message to be destroyed
            for (var i = 0; i < $scope.friends[index].messages.length; i++) {
              var thisMessage = $scope.friends[index].messages[i];
              // if match found, set messageIndex to index in messages array
              if (message.to === thisMessage.to && message.from === thisMessage.from && message.timestamp === thisMessage.timestamp && message.message === thisMessage.encryptedMessage) {
                messageIndex = i;
                break;
              }
            }
            if (messageIndex !== -1) {
              $scope.friends[index].messages.splice(messageIndex, 1);
            }
          }
        });
      });


      //Get friends through our socket
      $scope.getFriends = function(){
        socket.emit('getFriends', {});
        // Get friends through facebook
        window.postMessage({ type: 'getFacebookFriends', text: ''}, '*');
      };

      socket.on('friendsList', function(friends){
        for (var i = 0; i < friends.length; i++) {
          var friend = friends[i];
          $scope.friends.push(createFriendObj(friend));
        }
      });

      //so a user can't spam another user with friendRequests
      var friendRequestsSentTo = []; 

      $scope.addFriend = function(newFriendUsername){
        $scope.newFriendUsername = '';

        var friendUsernames = $scope.friends.map(function(friend) {
          return friend.username;
        });

        if (newFriendUsername === $scope.currentUser) {
          $scope.friendReqMsg = "Feeling lonely?";
        } else if (friendUsernames.indexOf(newFriendUsername) > -1) {
          $scope.friendReqMsg = "You are already friends with " + newFriendUsername;
        } else if (friendRequestsSentTo.indexOf(newFriendUsername) > -1) {
          $scope.friendReqMsg = "Friend request already sent!";
        } else {
          socket.emit('addFriend', { to: newFriendUsername });
          $scope.friendReqMsg = "Friend request sent";
          friendRequestsSentTo.push(newFriendUsername);
        } 
        
        $scope.sentRequest = true;
        
        
        $timeout(function() {
          $scope.sentRequest = false;
        }, 2000);
      };

      $scope.acceptFriendRequest = function (friend) {
        socket.emit('friendRequestAccepted', {from: $scope.currentUser, to: friend});
        for (var i = 0; i < $scope.friendRequests.length; i++) {
          if (friend === $scope.friendRequests[i]) {
            $scope.friendRequests.splice(i, 1);
            var newFriend = createFriendObj(friend);
            $scope.friends.push(newFriend);
            $scope.getFriends();
          }
        }
      };

      $scope.ignoreFriendRequest = function (friend) {
        for (var i = 0; i < $scope.friendRequests.length; i++) {
          if (friend === $scope.friendRequests[i]) {
            $scope.friendRequests.splice(i, 1);
          }
        }
        socket.emit('ignoreFriendRequest', {from: $scope.currentUser, to: friend});
      };

      $scope.acknowledgeFriendRequest = function (friend) {
        for (var i = 0; i < $scope.acceptedfriendRequests.length; i++) {
          if (friend === $scope.acceptedfriendRequests[i]) {
            $scope.acceptedfriendRequests.splice(i, 1);
          }
        }
        socket.emit('acknowledgeFriendRequest', {from: $scope.currentUser, to: friend});
      };

      $scope.fetchUnreadFriendRequests = function () {
        $scope.friendRequests = $stateParams.friendRequests;
      };

      $scope.fetchUnreadAcknowledgements = function () {
        $scope.acceptedfriendRequests = $stateParams.acceptedfriendRequests;
      };


      //login/logout
      $scope.logout = function() {
        $scope.currentUser = null;
        authFactory.logout();
        socket.emit('logout');
      };

      socket.on('friendLoggedIn', function(friend){
        findFriend(friend, function(index){
          //if user is in friends list
          if(index >= 0){
            $scope.friends[index].online = true;
          } else {
            //if user is not in friends list, add them
            $scope.friends.push(friend);
          }
        });
      });
      
      socket.on('friendLoggedOut', function (friend) {
        findFriend(friend, function (index) {
          //verify user is in friends list
          if (index >= 0) {
            $scope.friends[index].online = false;
            if ($scope.activeFriend) {
              if (friend === $scope.activeFriend.username) {
                $scope.activeFriend = null;
              }
            }
          }
        });
      });

      socket.on('friendRequest', function (friendRequest) {
        $scope.friendRequests.push(friendRequest.from);
      });

      socket.on('friendRequestAccepted', function(acceptFriendObj) {
        $scope.acceptedfriendRequests.push(acceptFriendObj.from);
        var newFriend = createFriendObj(acceptFriendObj.from);
        $scope.friends.push(newFriend);
        $scope.getFriends();

        socket.emit('sendPGP', publicKey);
      });

      //hoist helper functions
      function findFriend(friend, cb){ 
        for (var i = 0; i < $scope.friends.length; i++) { 
          if($scope.friends[i].username === friend){
            cb(i);
            return;
          }
        }
        //if friend not in list
        cb(-1);
      }
      //get friends when we have verified the user is signed in
      $scope.getFriends();
      $scope.fetchUnreadFriendRequests();
      $scope.fetchUnreadAcknowledgements();
    }//end if resp === 'ok'      
  });
});



/*

  angular controller
    initialize socket connection

    $scope.friends = [{
      service: (facebook, google, us, etc.),
      username: , (username is always hidden)
      name: , (for our service, this is the username)
      publicPGPKey: ,
      newMessage: boolean (for updating the friends list view)
      messages: [{
        to: ,
        from: ,
        message: ,
        timestamp: 
      }],
      unsentMessages: [{
        to: ,
        from: ,
        message: ,
        timestamp: 
      }]
    }]
    
    //invoked by clicking on user in friends list    
    $scope.startChat = function(username){
      //if $scope.friends[username] has publicPGPKey
        //update chat view with current conversation
      //else
        //if $scope.friends[username].service is us
          //render messages in chat view
        //else if username.service isnt us
          //allow unencrypted chat
          //show red encryption symbol/button (warning user chat is not secure)
    }

    //invoked by user clicking red encryption button (send user your public pgp key)
    $scope.sendPGP = function(){
      
      //if service is us
        //socket.emit('sendPGP', {key: userKey, to: recipient})
        //socket.emit('requestKey', {to: recipient})
      //else
        //send public key through extension via service
        //user is requesting your key message (install our extension!)
    }

    $scope.sendMessage = function(){
      //if service is us
        //if we have recipients pgp key
          //encrypt and send message
        //else
          //notify user you are requesting recipient's pgp key
          //socket.emit('requestKey', {to: recipient})
      //else
        //request other user's public key and save message contents to be encrypted on receipt of user's key 
          //user would like to have an encrypted conversation with you:
          //user's public key
    }

    //messaging
    socket.on('newMessage') render message contents in view
    emit new messages socket.emit('sendMessage', {to: , message: })
    socket.on('keyReceived') {key, from} 
      encrypt all messages for 'from' in unsentMessages and send to recipient
      store user's key in $scope.friends
    socket.on('keyRequested') {from}
      socket.emit('sendPGP') {key: pgpKey, to: from}
    
    //friends
    socket.on('refreshFriends') update friends list when user comes online or goes offline
    emit new friends socket.emit('addFriend', {to: })  
    
    intervalled (it's a word now) requests to content script for new messages and friends
      update $scope variables appropriately
      if pgp key was received 
        store user's pgp key in $scope.friends
*/
