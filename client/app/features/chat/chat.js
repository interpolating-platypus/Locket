angular.module('Locket.chat', [])

.controller('chatController', function ($scope, authFactory) {
  var socket = io();

  $scope.friends = [{
    service: "facebook",
    username: "nate",
    name: "nate dawg",
    newMessage: false,
    online: true,
    messages: [{
      to: 'nate',
      from: 'me',
      message: 'hi nate!',
      timestamp: new Date()
    }]
  },
  {
    service: "facebook",
    username: "livvie",
    name: "livvie dawg",
    newMessage: false,
    online: true,
    messages: [{
      to: 'livvie',
      from: 'me',
      message: 'hi livvie!',
      timestamp: new Date()
    }]
  }];

  //currently hardcoded for first friend
  //represents the user selected in the friends list
  $scope.activeFriend = $scope.friends[0];

  $scope.startChat = function(friend){
    findFriend(friend, function(index){
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

  socket.on('newMessage', function(message){
    findFriend(message.from, function(index){
      if (index !== -1) {
        $scope.$apply(function(){
          $scope.friends[index].messages.push(message);
        });
      }
    });

  });

  //friends
  $scope.addFriend = function(username){
    socket.emit('addFriend', { to: username });
  };

  $scope.logout = function() {
    authFactory.logout();
  };

  socket.on('friendLoggedIn', function(friend){
    findFriend(friend, function(index){
      //if user is in friends list
      if(index >= 0){
        $scope.friends[index].online = true;
      }else{
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
      }
    });
  });

  socket.on('friendRequest', function(friendRequest){
    
    console.log('friend request received from ' + friendRequest);
  });


  //hoist helper functions
  function findFriend(friend, cb){
    for (var i = 0; i < $scope.friends.length; i++) {
      // console.log($scope.friends[i].username);
      // console.log(friend);
      if($scope.friends[i].username === friend.username){

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
