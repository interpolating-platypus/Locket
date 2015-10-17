var app = require(__dirname + "/server.js");
var io = module.exports.io = require('socket.io').listen(app.server);

var userController = require("./features/users/userController.js"); 


console.log("Socket.io server listening");

exports.sessionMap = {

};

exports.userMap = {

};


io.on('connection', function(socket) {
  console.log('a user connected');
  //username
  var cookies = socket.request.headers.cookie.split(" ")
  var expressCookie = cookies[1].slice(12);
  // console.log(expressCookie);
  // userMap[expressCookie] = socket.id;
  // console.log(expressCookie);
  // console.log(socket.id);
  var username = exports.sessionMap[expressCookie];
  




  exports.userMap[username] = socket.id;



  // console.log(exports.userMap);





  socket.on('sendMessage', function(msg){
    io.emit('chat message', msg);
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
