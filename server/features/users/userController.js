var User = require('./userModel');
var Q = require('q');
var jwt = require('jwt-simple');


  // https://github.com/hackreactor/2015-08-shortly-angular/blob/solution/server/users/userController.js

exports.signin = function(req, res, next) {
  var username = req.body.username;
  var password = req.body.password;

  var findUser = Q.nbind(User.findOne, User);
  findUser({username: username})
    .then(function(user) {
      if(!user) {
        next(new Error('User does not exist'));
      } else {
        return user.comparePasswords(password)
          .then(function(foundUser) {
            if (foundUser) {
              var token = jwt.encode(user, 'secret');
              res.json({token: token});
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
      res.json({token: token});
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
    var user = jwt.decode(token, 'secret');
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




