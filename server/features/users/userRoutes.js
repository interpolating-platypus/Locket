var passport = require('passport');
require('../auth/passport');
var userController = require('./userController.js');
//attaching all our handlers on our userRouter

module.exports = function (app) {
  app.post('/login', function (req, res, next) {
    console.log("login posted");
    passport.authenticate('local', function (err, user, info) {
      console.log("login", err, user, info);
      userController.login(req, res, next);
    })(req, res, next);
  });
  app.post('/signup', userController.signup);
  app.get('/signedin', function (req, res, next) {
    console.log('signed in recieved');
    passport.authenticate('local', function (err, user, info) {
      console.log(err, user, info);
      if (err) {
        return next(err);
      }
      if (!user) {
        res.status(200).send('UNAUTHORIZED');
      } else {
        console.log('user');
        res.send(200).send('OK');
      }
    })(req, res, next);
  });
  app.get('/:username', function (req, res, next) {
    passport.authenticate('local', userController.getFriends(req, res, next));
  });
};
