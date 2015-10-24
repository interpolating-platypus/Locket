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
              // associate sid to username in socketHandler
              socketHandler.sessionMap[sid] = username;
              res.status(200).send();
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
      console.log('signup successful');
      socketHandler.sessionMap[sid] = username;
      res.status(200).send(username);
    })
    .fail(function(error) {
      next(error);
    });
};

exports.addFriend = function(user1, user2) {
  var findUser = Q.nbind(User.findOne, User);
  
  findUser({username: user1})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else {
        user.friends.push(user2);
        user.save(function (err) {
          if(err) {
            console.error('ERROR!');
          }
        });
      }
    })
    .fail(function(error) {
      next(error);
    });
};


exports.addFriends = function (acceptFriendObj) {
  var friend1 = acceptFriendObj.from;
  var friend2 = acceptFriendObj.to;
  exports.addFriend(friend1, friend2);
  exports.addFriend(friend2, friend1);
};
