angular.module('Locket', [
  'Locket.chat',
  'Locket.auth',
  'Locket.authFactory',
  // 'Locket.encryptionFactory',
  'ui.router'
])
.config(function ($stateProvider, $urlRouterProvider) {
  console.log('working');

  $stateProvider
    .state('chat', {
      url: '/',
      templateUrl: 'app/features/chat/chat.html',
      controller: 'chatController'
    })
    .state('login', {
      url: '/login',
      templateUrl: 'app/features/auth/login.html',
      controller: 'authController'
    })
    .state('signup', {
      url: '/signup',
      templateUrl: 'app/features/auth/signup.html',
      controller: 'authController'
    });

  $urlRouterProvider.otherwise('/login');
});
