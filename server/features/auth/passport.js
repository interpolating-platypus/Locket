var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var User = require('../users/userModel');
var Q = require('q');

module.exports = function(passport) {
  passport.serializeUser(function(user, done) {
    done(null, user.id);
  });

  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  passport.use(new LocalStrategy(
    function (username, password, done) {
      var findUser = Q.nbind(User.findOne, User);
      findUser({ username: username })
        .then(function (user) {
          if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
          }
          if (!user.validPassword(password)) {
            return done(null, false, { message: 'Incorrect password.' });
          }
          return done(null, user);
        })
        .fail(function(err){
          console.log(err);
          return(err);
        });
    }
  ));
};
