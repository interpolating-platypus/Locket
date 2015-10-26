var passport = require('passport');
require('../auth/passport');
var userController = require('./userController.js');
//attaching all our handlers on our userRouter

module.exports = function (app) {

  app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
      req.login(user, function(){
        userController.login(req, res, next);
      });
    })(req, res, next);
  });
  
  app.post('/signup', function (req, res, next) {
    userController.signup(req, res, next);
  });
  
  app.get('/signedin', isLoggedIn, function (req, res, next) {
    res.status(200).send('OK');
  });
};


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()){
    return next();
  }else{
    res.send('UNAUTHORIZED');
  }
}
