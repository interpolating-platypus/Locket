var keyResponseTimeout = 15000;
angular.module('Locket.chat', ['luegg.directives', 'ngAnimate'])

.controller('chatController', function ($scope, authFactory, $stateParams, socket, encryptionFactory, $timeout) {
  $("#photoUpload").filestyle({input:false, buttonText: "Upload Photo"});
  authFactory.signedin().then(function(resp){
    if (resp.auth === 'OK') {
      socket.connect();

      var keyring = encryptionFactory.generateKeyPair();
      var publicKey;
      // send public key to Locket friends on login
      keyring.then(function (keypair) {
        publicKey = keypair.pubkey;
        socket.emit('sendPGP', keypair.pubkey);
      });

      $scope.currentUser = $stateParams.username || resp.username;
      $scope.friends = [];

      var blockedUsers = $stateParams.blockedUsers;
      
      $scope.sentRequest = false;

      $scope.encrypted = false;
      //spinner initially set to false
      $scope.loading = false;

      //messaging
      $scope.showPhoto = false;


      $scope.$watch('activeFriend', function() {
        $scope.encrypted = $scope.activeFriend ? $scope.activeFriend.userIsEncrypted : false;
        $scope.showPhoto = ($scope.activeFriend.service === 'Locket') ? true: false;
        $(".bootstrap-filestyle").toggle($scope.showPhoto);
      });

      // on any change in activeFriend key, set $scope.encrypted based on whether there is a public key for the friend
      $scope.$watch('activeFriend.key', function (newValue, oldValue) {
        $scope.encrypted = newValue ? true : false;
        console.log('active friend key is now ',$scope.activeFriend, newValue);
      });

      $scope.$watch('encrypted', function (newValue, oldValue) {
        $('#enabled').toggleClass('checked', newValue);
        console.log('encrypted triggered');
      });

      $('#enabled').on('click', function (event) {
        setTimeout(function () {
          $('#enabled').toggleClass('checked', $scope.encrypted);
        }, 10);
      });

      function createFriendObj(username, online, name, service) {
        return {
          service: service || 'Locket',
          username: username,
          name: name || (username + ' daawwggg'),
          unreadMessage: false,
          online: online || false,
          key: '',
          messages: [],
          unsentMessages: [], // added this in for revoke and show decrypted message for sender
          unsentFBMessages: [], // Follows same convention. Will not work for messages from prev session
          sentKey: false,
          userIsEncrypted: false
        };
      }

      var messageDefaults = {
        to: null,
        from: null,
        message: null,
        type: 'text',
        isEncrypted: false,
        encryptedMessage: null,
        timestamp: Date.now()
      }

      // Listen for events from our extension
      window.addEventListener('message', function(event) {
        if (event.source != window)
          return;

        // Recieve a facebook friends list
        if (event.data.type && (event.data.type === 'facebookFriendsList')) {
          for (var i = 0; i < event.data.text.length; i++) {
            var friend = event.data.text[i];
            var friendObj = createFriendObj(friend.username, true, friend.name, "Facebook");
            $scope.friends.push(friendObj);
          }
          // After receiving a facebook friends list, begin monitoring the facebook DOM
          window.postMessage({ type: 'scanFacebookDOM', text: ''}, '*');
        }

        // Receive new facebook message(s)
        var partialPGPMessage = '';
        if (event.data.type && (event.data.type === 'receivedNewFacebookMessage')) {
          var username = event.data.text.with;
          var fullname = event.data.text.name;
          var newMessages = event.data.text.text;
          findFriend(username, function(index) {

            if (index === -1 && username !== 'me') {
              var newFriend = createFriendObj(username, true, fullname, "Facebook");
              $scope.friends.push(newFriend);
              index = $scope.friends.length-1;
            }
            for (var i = 0; i < newMessages.length; i++) {
              var newMessage = '';

              // PGP messages are in two parts, combine into one
              if (partialPGPMessage) {
                partialPGPMessage+='\n\n'+newMessages[i];
                if (newMessages[i].slice(-25) === '-----END PGP MESSAGE-----') {
                  var encryptedMessage = partialPGPMessage;
                  partialPGPMessage = '';
                  keyring.then(function(keypair) {
                    // If we sent the message, use the local decrypted version
                    if (event.data.text.from === 'me') {
                      // Create a message object
                      var message = {
                        encryptedMessage: encryptedMessage,
                        from: $scope.currentUser
                      }
                      _.defaults(message, messageDefaults);
                      // Make sure we add the correct message:
                      var addedMessage = false;
                      for (var j = 0; j < $scope.friends[index].unsentFBMessages.length; j++) {
                        if ($scope.friends[index].unsentFBMessages[j].encryptedMessage.replace(/[^a-z0-9]/gmi, '') === message.encryptedMessage.replace(/[^a-z0-9]/gmi,'')) {
                          message.message = $scope.friends[index].unsentFBMessages[j].message;
                          message.isEncrypted = $scope.friends[index].unsentFBMessages[j].isEncrypted;
                          $scope.friends[index].unsentFBMessages.splice(j, 1);
                          $scope.friends[index].messages.push(message);
                          addedMessage = true;
                          $scope.loading = false;
                          $scope.$apply();
                        }
                      }
                      if (!addedMessage) {
                        message.message = '[Message Expired]';
                        message.isEncrypted = true;
                        $scope.friends[index].messages.push(message);
                        $scope.$apply();
                      }
                    } else {
                      // Otherwise, decrypt the message using our private key
                      encryptionFactory.decryptMessage(keypair, encryptedMessage)
                      .then(function (decryptedMessage) {
                        var message = {
                          to: $scope.currentUser,
                          from: $scope.friends[index].username,
                          encryptedMessage: encryptedMessage,
                          message: decryptedMessage,
                          isEncrypted: true
                        }
                        _.defaults(message, messageDefaults);
                        $scope.friends[index].messages.push(message);
                        if (!$scope.activeFriend) {
                          $scope.activeFriend = $scope.friends[index];
                        }
                        else if ($scope.friends[index].username !== $scope.activeFriend.username) {
                          $scope.friends[index].unreadMessage = true;
                        }
                        $scope.$apply();
                      })
                      .catch(function() {
                        var message = {
                          to: $scope.currentUser,
                          from: $scope.friends[index].username,
                          encryptedMessage: encryptedMessage,
                          message: '[Message Expired]',
                          isEncrypted: true
                        }
                        _.defaults(message, messageDefaults);
                        $scope.friends[index].messages.push(message);
                      });
                    }
                  });
                }
              } else if (newMessages[i].substr(0,27) === '-----BEGIN PGP MESSAGE-----') {
                partialPGPMessage = newMessages[i];
              }
              else {
                // Non-PGP message: doesn't need decryption
                newMessage = newMessages[i];
              }
              // Inject the message if it exists (dont display encrypted ones from prev session)
              if (newMessage) {
                var message = {
                  to: (event.data.text.from === 'me') ? event.data.text.with : $scope.currentUser,
                  from: (event.data.text.from === 'me') ? $scope.currentUser : event.data.text.with,
                  message: newMessage
                }
                _.defaults(message, messageDefaults);
                $scope.friends[index].messages.push(message);

                // Notify the user of any unread messages
                if (!$scope.activeFriend) {
                  $scope.activeFriend = $scope.friends[index];
                }
                else if (!$scope.activeFriend || $scope.friends[index].username !== $scope.activeFriend.username) {
                  $scope.friends[index].unreadMessage = true;
                }
              }
            }
          });
        };

        // Receive PGP Key (over facebook)
        if (event.data.type && (event.data.type === 'receivedPGPKey')) {
          var username = event.data.text.from;
          var fullname = event.data.text.name;
          var friendKey = event.data.text.publicKey;
          var myKey = event.data.text.friendKey;

          //we need to verify the pgpkey is still valid for this session
          keyring.then(function(keypair){
            publicKey = keypair.pubkey;

            findFriend(username, function(index) {
              // If this is from a facebook friend not on the list, add as new
              if (index === -1 && username !== 'me') {
                var newFriend = createFriendObj(username, true, fullname, "Facebook");
                $scope.friends.push(newFriend);
                index = $scope.friends.length-1;
              }

              //verify event has this user's public key, and the friends public key already stored
              if (friendKey.replace(/[^a-z0-9]/gmi, '') === $scope.friends[index].key.replace(/[^a-z0-9]/gmi, '') && myKey.replace(/[^a-z0-9]/gmi, '') === publicKey.replace(/[^a-z0-9]/gmi, '')){
                //state is encrypted
                // set indicator for whether message is encrypted
                $scope.friends[index].userIsEncrypted = true;

                // 
                //window.postMessage({ type: 'bounce', text: }, '*');
              } else {

                //respond with myKey, mySession, friendSession
                console.log('Updating pgpKey for', $scope.friends[index].username);
                
                console.log('Storing public key for user', $scope.friends[index].username);
                // Store that friend's public key
                $scope.friends[index].key = friendKey;
                $scope.friends[index].userIsEncrypted = false;
                
                window.postMessage({
                  type: 'sendPublicKey',
                  publicKey: publicKey,
                  friendKey: friendKey,
                  to: $scope.friends[index].username
                }, '*');
                $scope.friends[index].sentKey = Date.now();
              }
              if ($scope.activeFriend && $scope.friends[index].username === $scope.activeFriend.username) {
                $scope.encrypted = $scope.friends[index].userIsEncrypted;
              }

              $scope.$apply();
            });
          });
        }
        $scope.$apply();
      });

      // We are requesting an encrypted chat with somebody. Send them our public key and request their public key in return
      $scope.requestEncryptedChat = function() {
        findFriend($scope.activeFriend.username, function(index) {
          $scope.friends[index].sentKey = true;
          window.postMessage({
            type: 'sendPublicKey',
            publicKey: publicKey,
            friendKey: $scope.friends[index].key,
            to: $scope.activeFriend.username
          }, '*');
        });
      };

      $scope.friendRequests = [];
      $scope.acceptedfriendRequests = [];

      //represents the user selected in the friends list
      $scope.activeFriend = null;

      $scope.startChat = function(friend){
        findFriend(friend.username, function(index){
          $scope.activeFriend = $scope.friends[index];
          if ($scope.friends[index].unreadMessage) {
            $scope.friends[index].unreadMessage = false;
          }
          $timeout(function() {
            angular.element(".sendMessageInput").focus();
          }, 100);
          // Load messages from facebook friends
          if ($scope.activeFriend.service === "Facebook") {
            window.postMessage({ type: 'readFacebookMessages', to: $scope.activeFriend.username}, '*');
          }
        });
      };

      $scope.sendMessage = function(messageText){
        //start spinner
        $scope.loading = true;

        //reset message text
        $scope.messageText = '';

        if ($scope.activeFriend.service === 'Locket') {
          // encrypt typed message
          if (messageText) {
            encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, messageText)
            .then(function (encryptedMessage) {
              if (messageText) {
                $scope.activeFriend.unsentMessages.push({message: messageText, encryptedMessage: encryptedMessage, isEncrypted: true});
                socket.emit('sendMessage', { to: $scope.activeFriend.username, message: encryptedMessage });
                $scope.loading = false;
              }
            });
          }

          // Encrypt and send the photo stream (if it exists)
          var f = document.getElementById('photoUpload').files[0];
          var r = new FileReader();
          r.onloadend = function(e) {
            var data = e.target.result;
            // Encrypt the photo
            encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, data.toString('base64'))
            .then(function(encryptedPhoto) {
              // Send the photo
              socket.emit('sendMessage', {
                to: $scope.activeFriend.username, 
                message: encryptedPhoto,
                type: 'image'
              });
              var message = {
                message: data.toString('base64'),
                encryptedMessage: encryptedPhoto,
                isEncrypted: true
              }
              _.defaults(message, messageDefaults);
              $scope.activeFriend.unsentMessages.push(message);
              $("#photoUpload").filestyle('clear');
              $scope.loading = false;
            });
          };
          // Read the file
          if (f) { r.readAsDataURL(f); }
        } else if ($scope.activeFriend.service === 'Facebook') {
          if ($scope.activeFriend.key) {
            encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, messageText)
            .then(function (encryptedMessage) {
              window.postMessage({ type: 'sendFacebookMessage', to: $scope.activeFriend.username, text: encryptedMessage}, '*');
              $scope.activeFriend.unsentFBMessages.push({
                message: messageText,
                encryptedMessage: encryptedMessage,
                isEncrypted: true
              });
            });
          } else {
            window.postMessage({ type: 'sendFacebookMessage', to: $scope.activeFriend.username, text: messageText}, '*');
          }
        }
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
          }
        });
      });

      socket.on('newMessage', function(message){
        findFriend(message.from, function(index){
          if (index !== -1) {
            // decrypt message
            keyring.then(function (keypair) {
              encryptionFactory.decryptMessage(keypair, message.encryptedMessage)
              .then(function (decryptedMessage) {
                message.message = decryptedMessage;
                message.isEncrypted = true;
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

      socket.on('newPhoto', function(photo) {
        findFriend(photo.from, function(index) {
          if (index !== -1) {
            keyring.then(function(keypair) {
              encryptionFactory.decryptMessage(keypair, photo.encryptedMessage)
              .then(function (decryptedPhoto) {
                $scope.friends[index].messages.push({
                  type: 'image',
                  timestamp: Date.now(),
                  isEncrypted: 'true',
                  source: decryptedPhoto
                });
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
            // iterate through unsent messages to find the message
            for (var i = 0; i < $scope.friends[index].unsentMessages.length; i++) {
              if ($scope.friends[index].unsentMessages[i].encryptedMessage === message.encryptedMessage) {
                message.message = $scope.friends[index].unsentMessages[i].message;
                message.isEncrypted = $scope.friends[index].unsentMessages[i].isEncrypted;
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
          $scope.friends.unshift(createFriendObj(friend));
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
            $scope.friends.unshift(newFriend);
            //now this function just updates the online property for the new friend
            findFriend(friend, function(index){
              if(index >= 0){
                $scope.friends[index].online = true;
              } else {
                $scope.friends.unshift(createFriendObj(friend));
              }
            });
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

      $scope.blockUser = function (user) {
        socket.emit('blockUser', {from: $scope.currentUser, to: user});
        blockedUsers.push(user);        
        $scope.ignoreFriendRequest(user);
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
            $scope.friends.unshift(createFriendObj(friend));
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
        if (blockedUsers.indexOf(friendRequest.from) === -1) {
          $scope.friendRequests.push(friendRequest.from);
        } 
      });

      socket.on('friendRequestAccepted', function(acceptFriendObj) {
        $scope.acceptedfriendRequests.push(acceptFriendObj.from);
        var newFriend = createFriendObj(acceptFriendObj.from);
        $scope.friends.unshift(newFriend);
        // now just check if newFriend is online
        findFriend(newFriend.username, function(index){
          if(index >= 0){
            $scope.friends[index].online = true;
          } else {
            $scope.friends.unshift(createFriendObj(friend));
          }
        });

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
