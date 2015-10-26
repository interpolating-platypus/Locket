angular.module('Locket', [
  'Locket.chat',
  'Locket.auth',
  'Locket.authFactory',
  'Locket.socketFactory',
  'ui.router',
  'Locket.encryptionFactory',
  'luegg.directives'
])
.config(function ($stateProvider, $urlRouterProvider) {

  $stateProvider
    .state('chat', {
      params: {username: null, friendRequests: [], acceptedfriendRequests: []},
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

// Testing of communication with extension
// setInterval(function() {
//   console.log('SENDING MESSAGE FROM WEBPAGE');
//   chrome.runtime.sendMessage('dofijaacecgdmkafjmfbifjgbelnhibh', {test: 'test'}); 
//   window.postMessage({ type: "FROM_PAGE", text: "Hello from the webpage!" }, "*");
// }, 5000);
// window.addEventListener('message', function(event) {
//   // We only accept messages from ourselves
//   if (event.source != window)
//     return;
//   if (event.data.type && (event.data.type == "FROM_EXT")) {
//     console.log("Page received: " + event.data.text);
//   }
// });
