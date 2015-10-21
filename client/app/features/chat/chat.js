angular.module('Locket.chat', [])

.controller('chatController', function ($scope, authFactory, $stateParams, socket) {
  socket.connect();
  $scope.currentUser = $stateParams.currentUser;
  $scope.friends = [];

  function createFriendObj(friend) {
    return {
      service: "Locket",
      username: friend,
      name: friend + " daawwggg",
      newMessage: false,
      online: true,
      messages: []
    };
  }

  $scope.getFriends = function () {
    authFactory.getFriends($scope.currentUser).then(function(friends) {
      // console.log('userObj from client', friends);
      for (var i = 0; i < friends.length; i++) {
        var friend = friends[i];
        $scope.friends.push(createFriendObj(friend));
      }
    });
  };

  $scope.friendRequests = [];
  $scope.acceptedfriendRequests = [];

  //represents the user selected in the friends list
  $scope.activeFriend = null;

  $scope.startChat = function(friend){
    findFriend(friend.username, function(index){
      $scope.activeFriend = $scope.friends[index];
    });
    //if $scope.friends[username] has publicPGPKey
      //update chat view with current conversation
    //else
      //if $scope.friends[username].service is us
        //render messages in chat view
      //else if username.service isnt us
        //allow unencrypted chat
        //show red encryption symbol/button (warning user chat is not secure)
  };

  //messaging
  $scope.sendMessage = function(messageText){
    //reset message text
    $scope.messageText = '';
    socket.emit('sendMessage', { to: $scope.activeFriend.username, message: messageText });
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
    socket.emit('revokeMessage', message);
  };

  socket.on('newMessage', function(message){
    findFriend(message.from, function(index){
      if (index !== -1) {
        $scope.friends[index].messages.push(message);
      }
      console.log('INDEX',index);
    });
  });

  socket.on('messageSent', function(message){
    findFriend(message.to, function(index){
      if (index !== -1) {
        $scope.friends[index].messages.push(message);
      }
    });
  });

  socket.on('destroyMessage', function(message) {
    findFriend(message.from, function(index){
      if (index !== -1) {
        var messageIndex = -1;
        // iterate through messages to find one that matches message to be destroyed
        for (var i = 0; i < $scope.friends[index].messages.length; i++) {
          var thisMessage = $scope.friends[index].messages[i];
          // if match found, set messageIndex to index in messages array
          if (message.from === thisMessage.from && message.timestamp === thisMessage.timestamp && message.message === thisMessage.message) {
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

  socket.on('deleteMessage', function(message) {
    findFriend(message.to, function(index){
      if (index !== -1) {
        var messageIndex = -1;
        // iterate through messages to find one that matches message to be destroyed
        for (var i = 0; i < $scope.friends[index].messages.length; i++) {
          var thisMessage = $scope.friends[index].messages[i];
          // if match found, set messageIndex to index in messages array
          if (message.from === thisMessage.from && message.timestamp === thisMessage.timestamp && message.message === thisMessage.message) {
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

  //friends
  $scope.addFriend = function(newFriendUsername){
    $scope.newFriendUsername = '';
    socket.emit('addFriend', { to: newFriendUsername });
  };

  $scope.logout = function() {
    $scope.currentUser = null;
    authFactory.logout();
    socket.emit('logout');
  };

  $scope.acceptFriendRequest = function (friend) {
    socket.emit('friendRequestAccepted', {from: $scope.currentUser, to: friend});
    for (var i = 0; i < $scope.friendRequests.length; i++) {
      if (friend === $scope.friendRequests[i]) {
        $scope.friendRequests.splice(i, 1);
        $scope.friends.push(createFriendObj(friend));
      }
    }
  };

  $scope.ignoreFriendRequest = function (friend) {
    for (var i = 0; i < $scope.friendRequests.length; i++) {
      if (friend === $scope.friendRequests[i]) {
        $scope.friendRequests.splice(i, 1);
      }
    }
  };

  $scope.acknowledgeFriendRequest = function (index) {
    $scope.acceptedfriendRequests.splice(index, 1);
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
  
  socket.on('friendLoggedOut', function(friend){
    findFriend(friend, function(index){
      //verify user is in friends list
      if(index >= 0){
        $scope.friends[index].online = false;
        if ($scope.activeFriend) {
          if (friend === $scope.activeFriend.username) {
            $scope.activeFriend = null;
          }
        }
      }
    });
  });

  socket.on('friendRequest', function(friendRequest){
    
    console.log('friend request received from ' + friendRequest.from);

    $scope.friendRequests.push(friendRequest.from);
  });

  socket.on('friendRequestAccepted', function(acceptFriendObj) {
    console.log('FRIEND REQ ACCEPTED', acceptFriendObj);
    // acceptFriendObj.from

    $scope.acceptedfriendRequests.push(acceptFriendObj.from);
    $scope.friends.push(createFriendObj(acceptFriendObj.from));
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
