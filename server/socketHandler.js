var app = require(__dirname + "/server.js");
var io = module.exports.io = require('socket.io').listen(app.server);

var userController = require("./features/users/userController.js"); 


console.log("Socket.io server listening");

var sessionMap = exports.sessionMap = {};

var userMap = exports.userMap = {};

io.use(app.socketSession(app.session, {
  autoSave: true
}));


io.on('connection', function(socket) {
  console.log('a user connected');
  //username
  console.log('SESSION MAP', sessionMap);
  
  //now through use of line 12 we have the same express cookie through socket.handshake.sessionID
  var expressCookie = socket.handshake.sessionID
  // console.log(expressCookie);


  var username = sessionMap[expressCookie];
  // console.log('username', username);
  userMap[username] = socket.id;
  console.log('USER MAP', userMap);

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

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
  
  // on connection, getCurrentUser, searchDatabase for currentUser, respondwithFriendsList
  // socket.on('sendMessage', function(to, message) {

  // });

  socket.on('login', function(username, password) {

  })

  socket.on('signup', function(username, password) {

  })
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
