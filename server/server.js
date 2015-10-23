var express = require('express');
var parser = require('body-parser');
var mongoose = require('mongoose');
// var mongodb = require('mongodb');
var uriUtil = require('mongodb-uri');

var options = { server: { socketOptions: { keepAlive: 1, connectTimeoutMS: 30000 } }, 
                replset: { socketOptions: { keepAlive: 1, connectTimeoutMS : 30000 } } };    

// var mongoUri = process.env.MONGOLAB_URI || 'mongodb://localhost/locket';
var mongodbUri = process.env.MONGOLAB_URI;
var mongooseUri = uriUtil.formatMongoose(mongodbUri) || 'mongodb://localhost/locket';

mongoose.connect(mongooseUri, options);

var session = exports.session = require("express-session")({
  secret: "mr meeseeks",
  resave: true,
  saveUninitialized: true
});

var socketSession = exports.socketSession = require('express-socket.io-session');

var app = express();

var server = require('http').createServer(app);
// mongoose.connect('mongodb://localhost/locket');



// var routes = require(__dirname + '/routes.js');
// var users = require(__dirname + 'features/users/users.js');
// var auth = require(__dirname + 'features/auth.js');
var userRouter = express.Router();

app.use(parser.json());

app.use(session);


app.use(express.static(__dirname + '/../client'));
app.use('/api/users', userRouter);
// app.use('/auth', auth);
// app.use('/users', users);

// catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   var err = new Error('ERROR!');
//   err.status = 404;
//   next(err);
// });


server.listen(process.env.PORT || 1337);

console.log("Express server listening");

module.exports.server = server;


var socketHandler = require(__dirname + '/socketHandler.js');


require('./features/users/userRoutes.js')(userRouter);


/*
  serve static files ../client
  
  setUp socket listeners
    socketHandler.js

  route calls through: 
    routes.js:
*/
