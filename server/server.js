var express = require('express');
var parser = require('body-parser');
var mongoose = require('mongoose');

var app = express();

var server = require('http').createServer(app);

var socketHandler = require(__dirname + '/socketHandler.js');
var routes = require(__dirname + '/routes.js');
var users = require(__dirname + 'features/users/users.js');
var auth = require(__dirname + 'features//auth.js');

app.use(parser.json());
app.use(express.static(__dirname + '/../client'));
app.use('/', routes);
// app.use('/auth', auth);
// app.use('/users', users);

server.listen(process.env.PORT || 1337);

module.exports.server = server;

console.log("Express server listening");


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('ERROR!');
  err.status = 404;
  next(err);
});


mongoose.connect('mongodb://localhost/locket');

















/*
  serve static files ../client
  
  setUp socket listeners
    socketHandler.js

  route calls through: 
    routes.js:
*/
