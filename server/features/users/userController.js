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
        return user.validPassword(password)
          .then(function(foundUser) {
            if (foundUser) {
              // Associate sid to username in socketHandler
              socketHandler.sessionMap[sid] = username;
              // Send back username to set as $scope.currentUser and their unread friendRequests
              res.status(200).send(
                {username: username, 
                 friendRequests: user.friendRequests, 
                 acceptedfriendRequests: user.acceptedfriendRequests,
                 blockedUsers: user.blockedUsers});
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
      socketHandler.sessionMap[sid] = username;
      res.status(200).send(
        {username: username, 
         friendRequests: user.friendRequests, 
         acceptedfriendRequests: user.acceptedfriendRequests});
    })
    .fail(function(error) {
      next(error);
    });
};

exports.friendRequestOffline = function(user1, user2, next) {
  var findUser = Q.nbind(User.findOne, User);

  findUser({username: user1})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else if (user.blockedUsers.indexOf(user2) > -1) {
      } else if (user.friendRequests.indexOf(user2) === -1){
        user.friendRequests.push(user2);
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

exports.removeUnreadFriendRequest = function(user1, user2) {

  var findUser = Q.nbind(User.findOne, User);

  findUser({username: user1})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else {
        for (var i = 0; i < user.friendRequests.length; i++) {
          if (user.friendRequests[i] === user2) {
            user.friendRequests.splice(i, 1);
          }
        }
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

exports.blockUser = function(user1, user2) {
  var findUser = Q.nbind(User.findOne, User);

  findUser({username: user1})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else {
        user.blockedUsers.push(user2);
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

exports.notifyFriendRequestAccepted = function(user1, user2) {
  var findUser = Q.nbind(User.findOne, User);
  
  findUser({username: user1})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else {
        user.acceptedfriendRequests.push(user2);
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

exports.acknowledgeFriendRequest = function(user1, user2) {
  var findUser = Q.nbind(User.findOne, User);
  
  findUser({username: user1})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else {
        for (var i = 0; i < user.acceptedfriendRequests.length; i++) {
          if (user.acceptedfriendRequests[i] === user2) {
            user.acceptedfriendRequests.splice(i, 1);
          }
        }
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

exports.addFriend = function(user1, user2) {
  var findUser = Q.nbind(User.findOne, User);
  
  findUser({username: user1})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } 

      if (user.friends.indexOf(user2) > -1) {
        console.log(user2 + " is already in friends list")
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
