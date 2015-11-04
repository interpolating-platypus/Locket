angular.module('Locket', [
  'Locket.chat',
  'Locket.auth',
  'Locket.authFactory',
  'Locket.socketFactory',
  'ui.router',
  'Locket.encryptionFactory',
  'luegg.directives',
  'uiSwitch',
  'validation.match',
  'emoji',
  'ngSanitize'
])
.config(function ($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('chat', {
      params: {username: null, friendRequests: [], acceptedfriendRequests: [], blockedUsers: []},
      url: '/',
      templateUrl: 'app/features/chat/chat.html',
      controller: 'chatController'
    })
    .state('login', {
      url: '/login',
      templateUrl: 'app/features/auth/login.html',
      controller: 'authController'
    });

  $urlRouterProvider.otherwise('/login');
});
