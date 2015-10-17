angular.module('Locket.chat', [])

.controller('chatController', function ($scope) {
  
  $scope.friends = [{
    service: "facebook",
    username: "nate",
    name: "nate dawg",
    newMessage: false,
    messages: [{
      to: 'nate',
      from: 'me',
      message: 'hi friend!',
      timestamp: new Date()
    }]
  }];

  //currently hardcoded for first friend
  $scope.activeFriend = $scope.friends[0];

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
    socket.on('friends') update friends list
    emit new friends socket.emit('addFriend', {to: })  
    
    intervalled (it's a word now) requests to content script for new messages and friends
      update $scope variables appropriately
      if pgp key was received 
        store user's pgp key in $scope.friends
*/
