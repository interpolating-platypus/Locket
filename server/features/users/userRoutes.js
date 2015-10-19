var userController = require('./userController.js');
//attaching all our handlers on our userRouter

module.exports = function (app) {
  app.post('/login', userController.login);
  app.post('/signup', userController.signup);
  app.get('/signedin', userController.checkAuth);
  app.get('/allUsers', userController.getAllUsers);
  app.get('/:username', userController.getFriends);
  // don't need this if no need for API request on logout
  // app.get('/logout', userController.logout);
};
