var User = require('./userModel');
var Q = require('q');
var jwt = require('jwt-simple');

var socketHandler = require('../../socketHandler.js');

exports.login = function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;
  var sid = req.sessionID;
  console.log('SID FROM USERCONTROLLER', username, sid);

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
              res.status(200).send(username);
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
      // res.json({token: token}); // change this to redirect
      
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
}


exports.addFriends = function (acceptFriendObj) {
  var friend1 = acceptFriendObj.from; //yilin
  var friend2 = acceptFriendObj.to;   //nate
  exports.addFriend(friend1, friend2);
  exports.addFriend(friend2, friend1);
};

exports.getFriends = function (req, res, next) {
  var user = req.params.username;
  var findUser = Q.nbind(User.findOne, User);

  findUser({username: user})
    .then(function(user) {
      if (!user) {
        next(new Error('User does not exist'));
      } else {
        // console.log("USER OBJ FROM SERVER", user);
        res.send(user);
      }
    })
    .fail(function(error) {
      next(error);
    });
};

exports.getAllUsers = function(req, res, next) {
  var findAllUsers = Q.nbind(User.find, User);

  findAllUsers()
    .then(function(users) {
      res.json(users);
    })
    .fail(function(error) {
      next(error);
    });
};

exports.checkAuth = function(req, res, next) {
  console.log('req', req);
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
          console.log('found user in checkAuth');
          res.send(200);
        } else {
          console.log('user not found in checkAuth');
          res.send(401);
        }
      })
      .fail(function(error) {
        next(error);
      });
  }
};
