var passport = require('passport');
require('../auth/passport');
var userController = require('./userController.js');
//attaching all our handlers on our userRouter

module.exports = function (app) {
  app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
      
      req.login(user, function(){
        console.log("login", err, user, info);
        userController.login(req, res, next);
      });
    })(req, res, next);
  });
  
  app.post('/signup', userController.signup);
  
  app.get('/signedin', isLoggedIn, function (req, res, next) {
    res.status(200).send('OK');
  });

  app.get('/:username', function (req, res, next) {
    passport.authenticate('local', userController.getFriends(req, res, next));
  });
};


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()){
    return next();
  }else{
    res.send('UNAUTHORIZED');
  }
}
