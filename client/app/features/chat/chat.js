//### Angular JS controller 
//**Handles all chat functionality**
angular.module('Locket.chat', ['luegg.directives', 'ngAnimate'])
.controller('chatController', function ($scope, authFactory, $stateParams, socket, encryptionFactory, $timeout) {
  // Configures the styles of the photo upload button
  $("#photoUpload").filestyle({input:false, buttonText: "Upload Photo"});

  // Makes sure the user is signed in before loading content
  authFactory.signedin().then(function(resp){
    if (resp.auth === 'OK') {
      socket.connect();

      // Generates the user's public and private keys for this session on login
      var keyring = encryptionFactory.generateKeyPair();
      var publicKey;

      // Sends public key to Locket friends on login
      keyring.then(function (keypair) {
        publicKey = keypair.pubkey;
        socket.emit('sendPGP', keypair.pubkey);
      });

      //**Program variables**
      $scope.currentUser = $stateParams.username || resp.username;
      $scope.friends = [];
      var blockedUsers = $stateParams.blockedUsers;
      $scope.sentRequest = false;
      $scope.encrypted = false;
      $scope.loading = false;
      $scope.showPhoto = false;
      $scope.friendRequests = [];
      $scope.acceptedfriendRequests = [];
      $scope.activeFriend = null;
      var friendRequestsSentTo = [];

      // When the userIsEncrypted property changes for Locket friend, toggle encryption switch
      $scope.$watch('activeFriend.userIsEncrypted', function() {
        if ($scope.activeFriend && $scope.activeFriend.service === 'Locket') {
          $scope.encrypted = $scope.activeFriend.userIsEncrypted;
        }
      });

      // When the active friend changes, mark whether the user is encrypted
      $scope.$watch('activeFriend', function() {
        $scope.encrypted = $scope.activeFriend ? $scope.activeFriend.userIsEncrypted : false;
        // Show photo button if the service is Locket
        $scope.showPhoto = ($scope.activeFriend && $scope.activeFriend.service === 'Locket') ? true: false;
        $(".bootstrap-filestyle").toggle($scope.showPhoto);
      });

      // When $scope.encrypted changes, toggle the encryption switch based on whether $scope.encrypted is true or false
      $scope.$watch('encrypted', function (newValue, oldValue) {
        $('#enabled').toggleClass('checked', newValue);
      });

      // On click of the encryption switch, make sure the toggle display aligns with encryption
      $('#enabled').on('click', function (event) {
        setTimeout(function () {
          $('#enabled').toggleClass('checked', $scope.encrypted);
        }, 10);
      });

      // Creates friend object for storage in friends array
      function createFriendObj(username, online, name, service) {
        return {
          service: service || 'Locket',
          username: username,
          name: name || username,
          unreadMessage: false,
          online: online || false,
          key: '',
          messages: [],
          unsentMessages: [], 
          unsentFBMessages: [],
          unsentHangoutsMessages: [],
          userIsEncrypted: false,
          sentKey: false,
          lastTimestamp: 0
        };
      }

      // Default properties for message objects
      var messageDefaults = {
        to: null,
        from: null,
        message: null,
        type: 'text',
        isEncrypted: false,
        encryptedMessage: null
      }

      // Listens for events from our extension
      window.addEventListener('message', function(event) {
        if (event.source != window)
          return;

        // Handles receipt of a facebook friends list
        if (event.data.type && (event.data.type === 'facebookFriendsList')) {
          for (var i = 0; i < event.data.text.length; i++) {
            var friend = event.data.text[i];
            var friendObj = createFriendObj(friend.username, true, friend.name, "Facebook");

            // Doesn't add a user if it's already present (can occur due to active user + in friends list)
            var dontAdd = false;
            for (var j = 0; j < $scope.friends.length; j++) {
              if ($scope.friends[j].service !== "Locket" && $scope.friends[j].username === friend.username) {
                dontAdd = true;
              }
            }
            if (!dontAdd) { $scope.friends.push(friendObj); }
          }

          // After receiving a facebook friends list, begin monitoring the facebook DOM
          window.postMessage({ type: 'scanFacebookDOM', text: ''}, '*');
          $scope.friendsLoading = false;
        }

        // Receives a request for the active encrypted facebook sessions
        if (event.data.type && (event.data.type === 'getEncryptedFriends')) {

          // Gets list of encrypted facebook friends
          var results = [];
          for (var i = 0; i < $scope.friends.length; i++) {
            if ($scope.friends[i].service !== "Locket" && $scope.friends[i].userIsEncrypted) {
              results.push({
                username: $scope.friends[i].username,
                service: $scope.friends[i].service
              });
            }
          }

          // Sends back the results
          window.postMessage({ type: 'encryptedFriends', text: results}, "*");
        }


        // Facebook and google hangouts friends will only be fetched if user has extension
        if (event.data.type && (event.data.type === 'extensionExists')) {
          window.postMessage({ type: 'getFacebookFriends', text: ''}, '*');
          window.postMessage({ type: 'getHangoutsFriends', text: ''}, '*');
          $scope.friendsLoading = true;
        }

        // Receives new facebook message(s)
        var partialPGPMessage = '';
        if (event.data.type && (event.data.type === 'receivedNewFacebookMessage' || event.data.type === 'receivedNewHangoutsMessage')) {
          var username = event.data.text.with;
          var fullname = event.data.text.name;
          var newMessages = event.data.text.text;
          var service;
          if(event.data.type === 'receivedNewFacebookMessage'){
            service = 'Facebook';
          }else if(event.data.type === 'receivedNewHangoutsMessage'){
            service = 'Hangouts';
          }

          findFriend(username, function(index) {

            // Message is from person not on friends list
            if (index === -1 && username !== 'me') {
              var newFriend = createFriendObj(username, true, fullname, service);
              $scope.friends.push(newFriend);
              index = $scope.friends.length-1;
            }

            // Handles new messages
            for (var i = 0; i < newMessages.length; i++) {
              var newMessage = '';

              // PGP messages are in at least two parts, combine into one
              if (partialPGPMessage) {
                partialPGPMessage+='\n\n'+newMessages[i];

                // PGP message is ending
                if (newMessages[i].slice(-25) === '-----END PGP MESSAGE-----') {
                  var encryptedMessage = partialPGPMessage;
                  partialPGPMessage = '';
                  decryptMessage(encryptedMessage, index, event.data.text.from, service);
                }
              } 

              // PGP message is beginning
              else if (newMessages[i].substr(0,27) === '-----BEGIN PGP MESSAGE-----') {

                // PGP message is contained in a single post
                if (newMessages[i].slice(-26).trim() === '-----END PGP MESSAGE-----'){
                  decryptMessage(newMessages[i], index, event.data.text.from, service);
                }

                // PGP message will continue in a subsequent message
                else{
                  partialPGPMessage = newMessages[i];
                }
              } 

              // Friend has disconnected from the chat
              else if (newMessages[i] === '*****USER DISCONNECT*****') {
                $scope.friends[index].userIsEncrypted = false;
              }

              // Message contains no special characters
              else {
                // Non-PGP message: doesn't need decryption
                newMessage = newMessages[i];
                $scope.loading = false;
              }

              // Injects the message if it exists (dont display encrypted ones from prev session)
              if (newMessage) {
                var message = {
                  to: (event.data.text.from === 'me') ? event.data.text.with : $scope.currentUser,
                  from: (event.data.text.from === 'me') ? $scope.currentUser : event.data.text.with,
                  message: newMessage,
                  timestamp: Date.now()
                }
                _.defaults(message, messageDefaults);
                $scope.friends[index].messages.push(message);
                $scope.friends[index].lastTimestamp = message.timestamp;

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

        // Receives PGP Key (over facebook or hangouts)
        if (event.data.type && (event.data.type === 'receivedPGPKey')) {
          var username = event.data.text.from;
          var fullname = event.data.text.name;
          var friendKey = event.data.text.publicKey;
          var myKey = event.data.text.friendKey;

          // Verifies the pgpkey is still valid for this session
          keyring.then(function(keypair){
            publicKey = keypair.pubkey;

            findFriend(username, function(index) {
              // If this is from a facebook friend not on the list, add as new
              if (index === -1 && username !== 'me') {
                var newFriend = createFriendObj(username, true, fullname, "Facebook");
                $scope.friends.push(newFriend);
                index = $scope.friends.length-1;
              }

              // Compares keys sent by friend to stored keys
              if (friendKey.replace(/[^a-z0-9]/gmi, '') === $scope.friends[index].key.replace(/[^a-z0-9]/gmi, '') && myKey.replace(/[^a-z0-9]/gmi, '') === publicKey.replace(/[^a-z0-9]/gmi, '')){
                $scope.friends[index].userIsEncrypted = true;
              } 
              else {

                // Responds with myKey, mySession, friendSession
                console.log('Updating pgpKey for', $scope.friends[index].username);
                
                // Stores that friend's public key
                $scope.friends[index].key = friendKey;

                // If they sent us a key for them, AND the key for us is correct, set them to encrypted
                if (friendKey && myKey.replace(/[^a-z0-9]/gmi, '') === publicKey.replace(/[^a-z0-9]/gmi, '')) { $scope.friends[index].userIsEncrypted = true; }
                else { $scope.friends[index].userIsEncrypted = false; }
                
                window.postMessage({
                  type: 'sendPublicKey',
                  publicKey: publicKey,
                  friendKey: friendKey,
                  to: $scope.friends[index].username,
                  service: $scope.friends[index].service
                }, '*');
                $scope.friends[index].sentKey = Date.now();
              }

              // Changes encryption toggle
              if ($scope.activeFriend && $scope.friends[index].username === $scope.activeFriend.username) {
                $scope.encrypted = $scope.friends[index].userIsEncrypted;
              }

              $scope.$apply();
            });
          });
        }

        // Recieves a hangouts friends list
        if (event.data.type && (event.data.type === 'hangoutsFriendsList')) {
          for (var i = 0; i < event.data.text.length; i++) {
            var friend = event.data.text[i];
            var friendObj = createFriendObj(friend.username, true, friend.name, "Hangouts");
            $scope.friends.push(friendObj);
          }

          window.postMessage({ type: 'scanHangoutsDOM', text: ''}, '*');
        }

        $scope.$apply();
      });

      // We are requesting an encrypted chat 
      // Sends the recipient our public key and request their public key in return
      $scope.requestEncryptedChat = function() {
        findFriend($scope.activeFriend.username, function(index) {
          $scope.friends[index].sentKey = true;
          window.postMessage({
            type: 'sendPublicKey',
            publicKey: publicKey,
            friendKey: $scope.friends[index].key,
            to: $scope.activeFriend.username,
            service: $scope.friends[index].service
          }, '*');

          // Displays sending-encryption message to user, with timeout
          $scope.encryptionReqMsg = true;
          $timeout(function() {
            $scope.encryptionReqMsg = false;
          }, 2000);
        });
      };

      // Changes active friend on click of a user in friends list by iterating through friends and setting activeFriend to clicked friend
      $scope.startChat = function(friend){
        findFriend(friend.username, function(index){
          $scope.activeFriend = $scope.friends[index];
          if ($scope.friends[index].unreadMessage) {
            $scope.friends[index].unreadMessage = false;
          }

          // Upon starting a chat, select the input text box
          $timeout(function() { 
            $(".sendMessageInput").focus();
            $(".sendMessageInputFull").focus();
          }, 100);

          // Loads messages for that friend from appropriate service
          if ($scope.activeFriend.service === "Facebook") {
            window.postMessage({ type: 'readFacebookMessages', to: $scope.activeFriend.username}, '*');
          }else if($scope.activeFriend.service === "Hangouts"){
            window.postMessage({ type: 'readHangoutsMessages', to: $scope.activeFriend.username}, '*');
          }
        });
      };

      // On submission of a message, send an encrypted verison of what was typed in as the input to the server
      $scope.sendMessage = function(messageText){

        // Starts spinner
        $scope.loading = true;

        // Resets message text
        $scope.messageText = '';

        //**Locket-specific message handling**
        if ($scope.activeFriend.service === 'Locket') {

          // Encrypts message
          if (messageText) {
            encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, messageText)
            .then(function (encryptedMessage) {
              if (messageText) {
                $scope.activeFriend.unsentMessages.push({message: messageText, encryptedMessage: encryptedMessage, isEncrypted: true});

                // Sends the message to the appropriate user using sockets
                socket.emit('sendMessage', { to: $scope.activeFriend.username, message: encryptedMessage });

                // Sets the spinner back to false
                $scope.loading = false;
              }
            });
          }

          // Encrypts and sends the photo stream (if it exists)
          var f = document.getElementById('photoUpload').files[0];
          var r = new FileReader();
          r.onloadend = function(e) {
            var data = e.target.result;

            // Encrypts the photo
            encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, data.toString('base64'))
            .then(function(encryptedPhoto) {

              // Sends the photo
              socket.emit('sendMessage', {
                to: $scope.activeFriend.username, 
                message: encryptedPhoto,
                type: 'image'
              });
              var message = {
                message: data.toString('base64'),
                encryptedMessage: encryptedPhoto,
                isEncrypted: true,
                timestamp: Date.now()
              }
              _.defaults(message, messageDefaults);
              $scope.activeFriend.unsentMessages.push(message);
              $("#photoUpload").filestyle('clear');
              $scope.loading = false;
            });
          };

          // Reads the file
          if (f) { r.readAsDataURL(f); }
        } 

        //**Facebook-specific message handling**
        else if ($scope.activeFriend.service === 'Facebook') {

          // Sends encrypted message
          if ($scope.activeFriend.userIsEncrypted) {
            encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, messageText)
            .then(function (encryptedMessage) {
              window.postMessage({ type: 'sendFacebookMessage', to: $scope.activeFriend.username, text: encryptedMessage}, '*');
              $scope.activeFriend.unsentFBMessages.push({
                message: messageText,
                encryptedMessage: encryptedMessage,
                isEncrypted: true
              });
            });
          }

          // Sends unencrypted message
          else { 
            window.postMessage({ type: 'sendFacebookMessage', to: $scope.activeFriend.username, text: messageText}, '*');
          }
        }
        
        //**Hangouts-specific message handling**
        else if ($scope.activeFriend.service === 'Hangouts'){

          // Sends encrypted message
          if ($scope.activeFriend.key) {
            encryptionFactory.encryptMessage({pubkey: $scope.activeFriend.key}, messageText)
            .then(function (encryptedMessage) {
              window.postMessage({ type: 'sendHangoutsMessage', to: $scope.activeFriend.username, text: encryptedMessage}, '*');
              $scope.activeFriend.unsentHangoutsMessages.push({
                message: messageText,
                encryptedMessage: encryptedMessage,
                isEncrypted: true
              });
            });
          }

          // Sends unencrypted message
          else { 
            window.postMessage({ type: 'sendHangoutsMessage', to: $scope.activeFriend.username, text: messageText}, '*');
          }

        }
      };

      // On click of a user's own message, delete the message from both recipient and sender clients
      $scope.revokeMessage = function(message) {
        if (message.from === $scope.currentUser) {
          socket.emit('revokeMessage', {to: message.to, from: message.from, message: message.encryptedMessage, timestamp: message.timestamp});
        }
      };

      // Socket listener for when a friend has sent a PGP key--save the PGP key in friend object and send a key back
      socket.on('receivePGP', function (keyObj) {
        findFriend(keyObj.friend, function (index) {
          if (index !== -1) {
            $scope.friends[index].key = keyObj.key;
            $scope.friends[index].userIsEncrypted = true;
            socket.emit('returnPGP', {friend: keyObj.friend, key: publicKey});
          }
        });
      });

      // Socket listener from when a PGP key has been returned
      socket.on('completePGP', function (keyObj) {
        findFriend(keyObj.friend, function (index) {
          if (index !== -1) {
            $scope.friends[index].key = keyObj.key;
            $scope.friends[index].userIsEncrypted = true;
          }
        });
      });

      // Decrypts a message and push it to messages array in sender's friend object so that it renders on the chat page
      socket.on('newMessage', function(message){
        findFriend(message.from, function(index){
          if (index !== -1) {

            // Decrypts message
            keyring.then(function (keypair) {
              encryptionFactory.decryptMessage(keypair, message.encryptedMessage)
              .then(function (decryptedMessage) {
                message.message = decryptedMessage;
                message.isEncrypted = true;
                $scope.friends[index].messages.push(message);
                $scope.friends[index].lastTimestamp = message.timestamp;
                $scope.$apply();
              });
            });

            // Alerts user to unread messages
            if ($scope.activeFriend === null || $scope.friends[index].username !== $scope.activeFriend.username) {
              $scope.friends[index].unreadMessage = true;
            }
          }
        });
      });

      // Handles receipt of a new photo
      socket.on('newPhoto', function(photo) {

        // Decrypts photo
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
                $scope.friends[index].lastTimestamp = Date.now();
              });
            });

            // Alerts user to unread message
            if ($scope.activeFriend === null || $scope.friends[index].username !== $scope.activeFriend.username) {
              $scope.friends[index].unreadMessage = true;
            }
          }
        });
      });

      // Renders a sent message on the user's client chat page
      socket.on('messageSent', function (message) {
        findFriend(message.to, function (index) {
          if (index !== -1) {

            // Iterates through unsent messages to find the message, then splices it out and pushes it to messages in friend object
            for (var i = 0; i < $scope.friends[index].unsentMessages.length; i++) {
              if ($scope.friends[index].unsentMessages[i].encryptedMessage === message.encryptedMessage) {
                message.message = $scope.friends[index].unsentMessages[i].message;
                message.isEncrypted = $scope.friends[index].unsentMessages[i].isEncrypted;
                $scope.friends[index].unsentMessages.splice(i, 1);
                $scope.friends[index].messages.push(message);
                $scope.friends[index].lastTimestamp = message.timestamp;
              }
            }
          }
        });
      });

      // After server has received command to revoke a message, clear it from display
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

            // Iterates through messages to find one that matches message to be destroyed
            for (var i = 0; i < $scope.friends[index].messages.length; i++) {
              var thisMessage = $scope.friends[index].messages[i];

              // If match found, sets messageIndex to index in messages array
              if (message.to === thisMessage.to && message.from === thisMessage.from && message.timestamp === thisMessage.timestamp && message.message === thisMessage.encryptedMessage) {
                messageIndex = i;
                break;
              }
            }

            // Deletes the message from the messages array
            if (messageIndex !== -1) {
              $scope.friends[index].messages.splice(messageIndex, 1);
            }
          }
        });
      });

      // Retrieves Locket friends
      function getLocketFriends() {
        socket.emit('getFriends', {});
      };

      // Received Locket friends
      socket.on('friendsList', function(friends){
        for (var i = 0; i < friends.length; i++) {
          var friend = friends[i];
          $scope.friends.unshift(createFriendObj(friend));
        }
      });

      // Adds a Locket friend
      $scope.addFriend = function(newFriendUsername){
        $scope.newFriendUsername = '';

        var friendUsernames = $scope.friends.map(function(friend) {
          return friend.username;
        });

        // User tried to issue invalid friend request
        if (newFriendUsername === $scope.currentUser) {
          $scope.friendReqMsg = "Feeling lonely?";
        } 
        else if (friendUsernames.indexOf(newFriendUsername) > -1) {
          $scope.friendReqMsg = "You are already friends with " + newFriendUsername;
        } 
        else if (friendRequestsSentTo.indexOf(newFriendUsername) > -1) {
          $scope.friendReqMsg = "Friend request already sent!";
        } 
        
        // Emit friend request to server
        else {
          socket.emit('addFriend', { to: newFriendUsername });
          $scope.friendReqMsg = "Friend request sent";
          friendRequestsSentTo.push(newFriendUsername);
        } 
        
        // Displays friend request message to user
        $scope.sentRequest = true;
        $timeout(function() {
          $scope.sentRequest = false;
        }, 2000);
      };

      // Accepts a user's friend request
      $scope.acceptFriendRequest = function (friend) {
        socket.emit('friendRequestAccepted', {from: $scope.currentUser, to: friend});
        for (var i = 0; i < $scope.friendRequests.length; i++) {
          if (friend === $scope.friendRequests[i]) {
            $scope.friendRequests.splice(i, 1);
            var newFriend = createFriendObj(friend);
            $scope.friends.unshift(newFriend);

            // Updates the online property for the new friend
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

      // Ignores a user's friend request
      $scope.ignoreFriendRequest = function (friend) {
        for (var i = 0; i < $scope.friendRequests.length; i++) {
          if (friend === $scope.friendRequests[i]) {
            $scope.friendRequests.splice(i, 1);
          }
        }
        socket.emit('ignoreFriendRequest', {from: $scope.currentUser, to: friend});
      };

      // Acknowledges a user's acceptance of friend request
      $scope.acknowledgeFriendRequest = function (friend) {
        for (var i = 0; i < $scope.acceptedfriendRequests.length; i++) {
          if (friend === $scope.acceptedfriendRequests[i]) {
            $scope.acceptedfriendRequests.splice(i, 1);
          }
        }
        socket.emit('acknowledgeFriendRequest', {from: $scope.currentUser, to: friend});
      };

      // Blocks a user from sending future friend requests
      $scope.blockUser = function (user) {
        socket.emit('blockUser', {from: $scope.currentUser, to: user});
        blockedUsers.push(user);        
        $scope.ignoreFriendRequest(user);
      };

      // Fetches any pending friend requests for the user
      $scope.fetchUnreadFriendRequests = function () {
        $scope.friendRequests = $stateParams.friendRequests;
      };

      // Fetches any unread new friend acknowledgements
      $scope.fetchUnreadAcknowledgements = function () {
        $scope.acceptedfriendRequests = $stateParams.acceptedfriendRequests;
      };

      // Logout socket emits event that will disconnect the current user
      $scope.logout = function() {
        $scope.currentUser = null;
        authFactory.logout();
        socket.emit('logout');
      };

      // Informs the user's client when a friend has logged in
      socket.on('friendLoggedIn', function(friend){
        findFriend(friend, function(index){

          // If user is in friends list, sets online property for that friend to true so friends list will update
          if(index >= 0){
            $scope.friends[index].online = true;
          } 

          // If user is not in friends list, adds them
          else {
            $scope.friends.unshift(createFriendObj(friend));
          }
        });
      });
      
      // Informs user's client when a friend has logged out so that friends list is updated accordingly
      socket.on('friendLoggedOut', function (friend) {
        findFriend(friend, function (index) {

          // Verifies user is in friends list
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

      // Displays incoming friend request
      socket.on('friendRequest', function (friendRequest) {
        if (blockedUsers.indexOf(friendRequest.from) === -1) {
          $scope.friendRequests.push(friendRequest.from);
        } 
      });

      // Displays accepted friend request
      socket.on('friendRequestAccepted', function(acceptFriendObj) {
        $scope.acceptedfriendRequests.push(acceptFriendObj.from);
        var newFriend = createFriendObj(acceptFriendObj.from);
        $scope.friends.unshift(newFriend);

        // Checks if the new friend is online
        findFriend(newFriend.username, function(index){
          if(index >= 0){
            $scope.friends[index].online = true;
          } else {
            $scope.friends.unshift(createFriendObj(friend));
          }
        });

        socket.emit('sendPGP', publicKey);
      });

      // Hoists helper functions
      function findFriend(friend, cb){ 
        for (var i = 0; i < $scope.friends.length; i++) { 
          if($scope.friends[i].username === friend){
            cb(i);
            return;
          }
        }

        // Returns -1 if the friend does not exist
        cb(-1);
      }

      // Checks to see if the user has the extension installed
      function checkUserHasExtension() {
        window.postMessage({ type: 'checkExtension', text: ''}, '*');
      }

      // Handles decryption of messages
      function decryptMessage(encryptedMessage, index, from, service){
        keyring.then(function(keypair) {

          // If we sent the message, use the local decrypted version
          if (from === 'me') {

            // Creates a message object
            var message = {
              encryptedMessage: encryptedMessage,
              from: $scope.currentUser,
              timestamp: Date.now()
            }
            _.defaults(message, messageDefaults);

            // Keeps track of whether we were able to succesfully decrypt the message
            var addedMessage = false;

            var unsentMessages;

            if(service === "Facebook"){
              unsentMessages = $scope.friends[index].unsentFBMessages;
            }
            else if(service === "Hangouts"){
              unsentMessages = $scope.friends[index].unsentHangoutsMessages;
            }

            // Iterates over unsent messages to display the message which corresponds to the pgp message posted to the DOM
            for (var j = 0; j < unsentMessages.length; j++) {

              // Displays a stored decrypted message if it corresponds to the correct encrypted message
              if (unsentMessages[j].encryptedMessage.replace(/[^a-z0-9]/gmi, '') === message.encryptedMessage.replace(/[^a-z0-9]/gmi,'')) {
                message.message = unsentMessages[j].message;
                message.isEncrypted = unsentMessages[j].isEncrypted;
                unsentMessages.splice(j, 1);
                $scope.friends[index].messages.push(message);
                $scope.friends[index].lastTimestamp = message.timestamp;
                addedMessage = true;
                $scope.loading = false;
                $scope.$apply();
              }
            }

            // If the message was unable to be decrypted, displays that the message has expired
            if (!addedMessage) {
              message.message = '[Message Expired]';
              message.isEncrypted = true;
              $scope.friends[index].messages.push(message);
              $scope.friends[index].lastTimestamp = message.timestamp;
              $scope.$apply();
            }
          } 

          // Decrypts messages sent from other users using our private key
          else {
            encryptionFactory.decryptMessage(keypair, encryptedMessage)
            .then(function (decryptedMessage) {
              var message = {
                to: $scope.currentUser,
                from: $scope.friends[index].username,
                encryptedMessage: encryptedMessage,
                message: decryptedMessage,
                isEncrypted: true,
                timestamp: Date.now()
              }
              _.defaults(message, messageDefaults);
              $scope.friends[index].messages.push(message);
              $scope.friends[index].lastTimestamp = message.timestamp;
              if (!$scope.activeFriend) {
                $scope.activeFriend = $scope.friends[index];
              }
              else if ($scope.friends[index].username !== $scope.activeFriend.username) {
                $scope.friends[index].unreadMessage = true;
              }
              $scope.$apply();
            })

            // If the message cannot be decrypted, it has expired
            .catch(function() {
              var message = {
                to: $scope.currentUser,
                from: $scope.friends[index].username,
                encryptedMessage: encryptedMessage,
                message: '[Message Expired]',
                isEncrypted: true,
                timestamp: Date.now()
              }
              _.defaults(message, messageDefaults);
              $scope.friends[index].messages.push(message);
              $scope.friends[index].lastTimestamp = message.timestamp;
            });
          }
        });
      }

      checkUserHasExtension();
      getLocketFriends();
      $scope.fetchUnreadFriendRequests();
      $scope.fetchUnreadAcknowledgements();
    }
  });
});
