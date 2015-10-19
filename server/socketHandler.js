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
  userMap[username] = socket.id;
  console.log('USER MAP', userMap);

  // emit friendLoggedIn event to all user's friends
  // var currentFriends = UserModel.findOne({username: username}).friends;
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
    console.log('recipient socket', recipientSocket);
    if (recipientSocket) {
      io.to(recipientSocket).emit('newMessage', {
        to: msg.to,
        from: username,
        message: msg.message,
        timestamp: new Date()
      });
    } else {
      // Send error message to the client
    }
  });

  socket.on('addFriend', function (friendRequestObj) {
    console.log(friendRequestObj.to); //yilin
    var recipientSocket = userMap[friendRequestObj.to];
    
    console.log('recipient socket', recipientSocket);
    
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

    //acceptFriendObj.from = yilin
    //acceptFriendObj.to = nate
    var recipientSocket = userMap[acceptFriendObj.to];
    if (recipientSocket) {
      UserController.addFriends(acceptFriendObj);
      io.to(recipientSocket).emit('friendRequestAccepted', acceptFriendObj);
    } else {

    }

  });


  socket.on('disconnect', function(){
    console.log('user disconnected');
    // remove user from sessionMap and userMap
    delete userMap[username];
    delete sessionMap[expressCookie];
    io.emit('friendLoggedOut', username);
  });

  socket.on('logout', function(){
    console.log('user logged out');
    // remove user from sessionMap and userMap
    socket.disconnect();
  });

  // socket.on('login', function(username, password) {

  // });

  // socket.on('signup', function(username, password) {

  // });
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
