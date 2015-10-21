var app = require(__dirname + "/server.js");
var io = module.exports.io = require('socket.io').listen(app.server);

var UserController = require("./features/users/userController.js"); 
var UserModel = require("./features/users/userModel.js");

console.log("Socket.io server listening");

// map session ids to usernames
var sessionMap = exports.sessionMap = {};

// map usernames to socket ids
var userMap = exports.userMap = {};

io.use(app.socketSession(app.session, {
  autoSave: true
}));

io.on('connection', function(socket) {
  console.log('a user connected');
  console.log('SESSION MAP', sessionMap);
  
  var expressCookie = socket.handshake.sessionID;

  var username = sessionMap[expressCookie];
  if (username) {
    userMap[username] = socket.id;
    // emit friendLoggedIn event to all user's friends
    UserModel.findOne({username: username}, function (err, user) {
      if (err) {
        throw err;
      } else {
        for (var friendIndex = 0; friendIndex < user.friends.length; friendIndex++) {
          var friendSocket = userMap[user.friends[friendIndex]];
          if (friendSocket) {
            io.to(friendSocket).emit('friendLoggedIn', username);
            // emit event to current user to update current user's friend list with correct online property
            io.to(userMap[username]).emit('friendLoggedIn', user.friends[friendIndex]);
          } else {
            // if friend not logged in, emit event to tell current user friend is offline
            io.to(userMap[username]).emit('friendLoggedOut', user.friends[friendIndex]);
          }
        }
      }
    });
  }
  console.log('USER MAP', userMap);

  // emit friendLoggedIn event to all user's friends
  // var currentFriends = userModel.findOne({username: username}).friends;
  // hardcode for now until addFriends functionality working
  var currentFriends = ['nate', 'livvie'];
  for (var friendIndex = 0; friendIndex < currentFriends.length; friendIndex++) {
    var friendSocket = userMap[currentFriends[friendIndex]];
    if (friendSocket) {
      io.to(friendSocket).emit('friendLoggedIn', username);
      // emit event to current user to update current user's friend list with correct online property
      io.to(userMap[username]).emit('friendLoggedIn', currentFriends[friendIndex]);
    } else {
      // if friend not logged in, emit event to tell current user friend is offline
      io.to(userMap[username]).emit('friendLoggedOut', currentFriends[friendIndex]);
    }
  }

  socket.on('sendMessage', function(msg){
    // msg looks like {to: xx, message: }
    // We need to look up the to
    // And then we need to send it to that guy
    console.log(msg);
    var recipientSocket = userMap[msg.to];
    var message = {
      to: msg.to,
      from: username,
      message: msg.message,
      timestamp: new Date()
    };
    if (recipientSocket) {
      io.to(recipientSocket).emit('newMessage', message);
      io.to(userMap[username]).emit('messageSent', message);
    } else {
      // Send error message to the client
    }
  });

  socket.on('revokeMessage', function (message) {
    var recipientSocket = userMap[message.to];
    if (recipientSocket) {
      io.to(recipientSocket).emit('destroyMessage', message);
      io.to(userMap[username]).emit('deleteMessage', message);
    }
  });

  socket.on('addFriend', function (friendRequestObj) {
    console.log(friendRequestObj.to);
    var recipientSocket = userMap[friendRequestObj.to];
    
    if (recipientSocket) {
      io.to(recipientSocket).emit('friendRequest', {
        to: friendRequestObj.to,
        from: username,
        timestamp: new Date()
      });
    } else {

    }
    console.log(username);
  });

  socket.on('friendRequestAccepted', function(acceptFriendObj) {
    console.log("accepted", acceptFriendObj);

    var recipientSocket = userMap[acceptFriendObj.to];
    if (recipientSocket) {
      UserController.addFriends(acceptFriendObj);
      io.to(recipientSocket).emit('friendRequestAccepted', acceptFriendObj);
    } else {
      // user is not online, later should allow even if no recipient socket
      // perhaps have an unsent friend request storage
    }

  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
    // remove user from sessionMap and userMap
    delete userMap[username];
    delete sessionMap[expressCookie];
    io.emit('friendLoggedOut', username);
    console.log('disconnect sessionmap', sessionMap);
    console.log('disconnect usermap', userMap);
  });

  // Echo function, useful for debugging & testing
  socket.on('echo', function (obj) {
    console.log('ECHOING ', obj.name, obj.data);
    socket.emit(obj.name, obj.data);
  });

  socket.on('logout', function(){
    console.log('user logged out');
    // remove user from sessionMap and userMap
    socket.disconnect();
  });
});

/*
  module.exports.listen to server.js to set up io
  //socket.request
  set up all handlers (socket.on()) inside listen function
    connection
      respond to user with their friends list

    sendMessage (handles receipt of new message from users)
      {
        to: ,
        message: 
      }
      verify users are friends before sending message to recipient
    
    addFriend
      {
        to: 
      }
      notify requested friend of friend request
    
    sendPGP
      {
        key: ,
        to: 
      }
      send pgp key to recipient 
        socket.emit('keyReceived') {key, from}
    
    requestKey
      {
        to
      }
      request PGP key from 'to'
        socket.emit('keyRequested' {from}) 
    disconnect
      notify all friends that this user has signed off

*/
