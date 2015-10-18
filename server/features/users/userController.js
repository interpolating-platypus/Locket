var User = require('./userModel');
var Q = require('q');
var jwt = require('jwt-simple');

var socketHandler = require('../../socketHandler.js');

exports.login = function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var sid = req.sessionID;

  var findUser = Q.nbind(User.findOne, User);
  findUser({username: username})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else {
        return user.comparePasswords(password)
          .then(function(foundUser) {
            if (foundUser) {
              console.log('login successful');
              // associate sid to username in socketHandler
              // Add in 200 response / redirect to chat page. May need to be #/ instead of /
              socketHandler.sessionMap[sid] = username;
              res.status(200).send("Login Successful");
            } else {
              return next(new Error('No User'));
            }
          });
      }
    })
    .fail(function(error) {
      next(error);
    });
};


exports.signup = function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var sid = req.sessionID;

  var findOne = Q.nbind(User.findOne, User);

  findOne({username: username})
    .then(function(user) {
      if (user) {
        next(new Error('User already exists!'));
      } else {
        var create = Q.nbind(User.create, User);
        var newUser = {
          username: username,
          password: password
        };
        return create(newUser);
      }
    })
    .then(function(user) {
      var token = jwt.encode(user, 'secret');
      res.json({token: token}); // change this to redirect
      
      console.log('signup successful');
      socketHandler.sessionMap[sid] = username;
      // res.status(200).send("Signup Successful");
    })
    .fail(function(error) {
      next(error);
    });
}

exports.checkAuth = function(req, res, next) {
  var token = req.headers['x-access-token'];
  if (!token) {
    next(new Error('No token'));
  } else {
    var user = jwt.decode(token, 'secret'); // we're going to change this finduser to check to see if that session exists in our session-to-user-dict
    // NOTE2: this will be completely different if we use passport.js
    var findUser = Q.nbind(User.findOne, User);
    findUser({username: user.username})
      .then(function(foundUser) {
        if (foundUser) {
          res.send(200);
        } else {
          res.send(401);
        }
      })
      .fail(function(error) {
        next(error);
      });
  }
}
