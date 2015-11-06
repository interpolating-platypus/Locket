var app = require(__dirname + "/server.js");
var io = module.exports.io = require('socket.io').listen(app.server);

var UserController = require("./features/users/userController.js");
var UserModel = require("./features/users/userModel.js");

console.log("Socket.io server listening");

// Map session ids to usernames
var sessionMap = exports.sessionMap = {};

// Map usernames to socket ids
var userMap = exports.userMap = {};

io.use(app.socketSession(app.session, {
  autoSave: true
}));

io.on('connection', function (socket) {
  
  var expressCookie = socket.handshake.sessionID;

  var username = sessionMap[expressCookie];
  userMap[username] = socket.id;

  // Let friends know user has logged in
  notifyFriends('friendLoggedIn', username);

  socket.on('sendPGP', function (publicKey) {
    sendPGP(publicKey, username);
  });

  socket.on('returnPGP', function (returnKeyObj) {
    returnPGP(returnKeyObj, username);
  });

  socket.on('sendMessage', function (msg) {
    sendMessage(msg, username);
  });

  socket.on('sendPhoto', function (photo) {
    sendPhoto(photo, username);
  });

  socket.on('revokeMessage', function (msg) {
    revokeMessage(msg, username);
  });

  socket.on('getFriends', function () {
    getFriends(username);
  });

  socket.on('addFriend', function (friendRequestObj) {
    addFriend(friendRequestObj, username);
  });

  socket.on('friendRequestAccepted', function (acceptedObj) {
    friendRequestAccepted(acceptedObj, username);
  });

  socket.on('acknowledgeFriendRequest', function(acknowledgeObj) {
    UserController.acknowledgeFriendRequest(username, acknowledgeObj.to);
  });

  socket.on('ignoreFriendRequest', function(ignoreFriendObj) {
    UserController.removeUnreadFriendRequest(username, ignoreFriendObj.to);
  });

  socket.on('blockUser', function(blockUserObj) {
    UserController.blockUser(username, blockUserObj.to);
  });

  socket.on('disconnect', function () {
    disconnect(username);
  });

  // Echo function, useful for debugging & testing
  socket.on('echo', function (obj) {
    socket.emit(obj.name, obj.data);
  });

  socket.on('logout', function () {
    delete sessionMap[expressCookie];
    socket.disconnect();
  });

});

// Find logged in user in the database and send PGP key to all user's online friends
var sendPGP = function (publicKey, username) {
  if (username) {
    UserModel.findOne({username: username}, function (err, user) {
      if (err) {
        throw err;
      } else {
        for (var friendIndex = 0; friendIndex < user.friends.length; friendIndex++) {
          var friendSocket = userMap[user.friends[friendIndex]];
          if (friendSocket) {
            io.to(friendSocket).emit('receivePGP', {friend: username, key: publicKey});
          }
        }
      }
    });
  } else {
    console.log('User does not have socket mapped');
  }
};

// Return a PGP key to a particular user's socket
var returnPGP = function (returnKeyObj, username) {
  var friendSocket = userMap[returnKeyObj.friend];
  if (friendSocket) {
    io.to(friendSocket).emit('completePGP', {friend: username, key: returnKeyObj.key});
  }
};

// Send a message object with an encrypted message
var sendMessage = function (msg, username) {
  // Find the user in the database
  UserModel.findOne({username: username}, function (err, user) {
    if(err){
      throw err;
    }
    // Verify user is friends with the recipient
    if(~user.friends.indexOf(msg.to)){

      var recipientSocket = userMap[msg.to];
      
      var message = {
        to: msg.to,
        from: username,
        encryptedMessage: msg.message,
        timestamp: new Date(),
        type: msg.type || 'text'
      };

      if (recipientSocket) {
        io.to(recipientSocket).emit('newMessage', message);
        io.to(userMap[username]).emit('messageSent', message);
      } else {
        // Send error message to the client
        console.log('Error sending message');
      }

    }
  });
};

// Emit a socket event to revoke a message to both recipient and sender sockets
var revokeMessage = function (msg, username) {
  var recipientSocket = userMap[msg.to];

  if (recipientSocket && msg.from === username) {
    io.to(recipientSocket).emit('destroyMessage', msg);
    io.to(userMap[username]).emit('destroyMessage', msg);
  }
};

// Function to get all user's friends
var getFriends = function(username){
  UserModel.findOne({username: username}, function (err, user) {
    if (err) {
      throw err;
    } else {
      // Send all friends to client
      io.to(userMap[username]).emit('friendsList', user.friends);

      // Let client know which friends are online
      for (var i = 0; i < user.friends.length; i++) {
        if(userMap[user.friends[i]]){
          io.to(userMap[username]).emit('friendLoggedIn', user.friends[i]);
        }
      };
    }
  });
};

// Find the recipient user's socket and send a friend request if the friend is online, otherwise save unsent friend request in the database
var addFriend = function (friendRequestObj, username) {
  var recipientSocket = userMap[friendRequestObj.to];
  
  if (recipientSocket) {
    io.to(recipientSocket).emit('friendRequest', {
      to: friendRequestObj.to,
      from: username,
      timestamp: new Date()
    });
  } else {
    UserController.friendRequestOffline(friendRequestObj.to, username);
  }
};

// Remove friend request and add friend to database when friend request is accepted, and notify sender that request was accepted
var friendRequestAccepted = function (acceptFriendObj, username) {
  if(acceptFriendObj.from === username){
    var recipientSocket = userMap[acceptFriendObj.to];
    UserController.removeUnreadFriendRequest(username, acceptFriendObj.to);
    UserController.addFriends(acceptFriendObj);
    if (recipientSocket) {
      io.to(recipientSocket).emit('friendRequestAccepted', acceptFriendObj);
    } else {
      UserController.notifyFriendRequestAccepted(acceptFriendObj.to, username);
    }
  }
};

// Function called on disconnect to remove user from map and notify friends the user has logged out
var disconnect = function (username) {
  notifyFriends('friendLoggedOut', username);
  
  // Remove user from userMap
  delete userMap[username];
};

// Function to notify friends of a particular event, such as friendLoggedIn and friendLoggedOut
var notifyFriends = function(event, username){
  if (username) {
    UserModel.findOne({username: username}, function (err, user) {
      if (err) {
        throw err;
      } else {

        for (var friendIndex = 0; friendIndex < user.friends.length; friendIndex++) {
          var friendSocket = userMap[user.friends[friendIndex]];
          if (friendSocket) {
            io.to(friendSocket).emit(event, username);
            // Emit event to current user to update current user's friend list with correct online property
            io.to(userMap[username]).emit(event, user.friends[friendIndex]);
          } else {
            // If friend not logged in, emit event to tell current user friend is offline
            io.to(userMap[username]).emit('friendLoggedOut', user.friends[friendIndex]);
          }
        }

      }
    });
  } else {
    console.log('User does not have socket mapped');
  }
};
