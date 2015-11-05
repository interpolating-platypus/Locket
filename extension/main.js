//### Injected into the web application
//**Is responsible primarily for passing messages between the web app and the background of the extension**

// User navigated to our service. Tells our app to start up the facebook background script
chrome.runtime.sendMessage({ event: 'injectIframes', data: '' });

// Receives update from background processes
chrome.runtime.onMessage.addListener(function(message) {
  // Informs background process user has not disconnected from service
  if (message.event === 'stillAlive') {
    chrome.runtime.sendMessage({ event: 'stillAlive', data: '' });
    window.postMessage({ type: 'getEncryptedFriends'}, "*");
  }

  // Received a new facebook message
  if (message.event === "receivedNewFacebookMessage") {
    window.postMessage({ type: 'receivedNewFacebookMessage', text: message.data}, "*");
  }

  // Received facebook friends list
  if (message.event === "facebookFriendsList") {
    // Emits the facebook friends list to the extension
    window.postMessage({ type: 'facebookFriendsList', text: message.data}, "*");
  }

  // Received facebook/hangouts PGP key
  if (message.event === 'receivedPGPKey') {
    console.log('Received FB PGP Key (main)');
    window.postMessage({ type: 'receivedPGPKey', text: message.data}, "*");
  }

  //###BEGIN HANGOUTS LOGIC
  // Received hangouts friends list
  if (message.event === "hangoutsFriendsList") {
    // Emits the hangouts friends list to the extension
    window.postMessage({ type: 'hangoutsFriendsList', text: message.data}, "*");
  }

  // Received a new hangouts message
  if (message.event === "receivedNewHangoutsMessage") {
    window.postMessage({ type: 'receivedNewHangoutsMessage', text: message.data}, "*");
  }
});

// Registers the tabid with the background process
chrome.runtime.sendMessage({
  event: 'registerTabId',
  data: 'webapp'
});

// Listens to requests from web app
window.addEventListener('message', function(event) {
  if (event.source != window)
    return;

  // Listens for a list of active encrypted Facebook sessions
  if (event.data.type && (event.data.type === 'encryptedFriends')) {
    chrome.runtime.sendMessage({
      event: 'encryptedFriends',
      data: event.data.text
    });
  }

  // Checks if user has extension
  if (event.data.type && (event.data.type === 'checkExtension')) {
    window.postMessage({ type: 'extensionExists', text: ''}, "*");
  }

  // App is requesting facebook friends
  if (event.data.type && (event.data.type === 'getFacebookFriends')) {
    chrome.runtime.sendMessage({
      event: 'getFacebookFriends',
      data: ''
    });
  }

  // App is telling us to begin the DOM scan
  if (event.data.type && (event.data.type === 'scanFacebookDOM')) {
    chrome.runtime.sendMessage({
      event: 'scanFacebookDOM',
      data: ''
    });
  }

  // App is sending facebook message
  if (event.data.type && (event.data.type === 'sendFacebookMessage')) {
    chrome.runtime.sendMessage({
      event: 'sendFacebookMessage',
      data: {
        to: event.data.to,
        text: event.data.text
      }
    });
  }
  
  // App is requesting a key exchange
  if (event.data.type && (event.data.type === 'sendPublicKey')) {
    console.log('main: requesting public key');
    chrome.runtime.sendMessage({
      event: 'sendPublicKey',
      data: {
        to: event.data.to,
        publicKey: event.data.publicKey,
        friendKey: event.data.friendKey,
        service: event.data.service
      }
    });
  }

  // App is requesting us to read facebook messages for clicked-on user
  if (event.data.type && (event.data.type === 'readFacebookMessages')) {
    chrome.runtime.sendMessage({
      event: 'readFacebookMessages',
      data: {
        to: event.data.to,
      }
    });
  }

  //###BEGIN HANGOUTS LOGIC
  // App is requesting hangouts friends
  if (event.data.type && (event.data.type === 'getHangoutsFriends')) {
    chrome.runtime.sendMessage({
      event: 'getHangoutsFriends',
      data: ''
    });
  }

  // App telling us to begin the DOM scan
  if (event.data.type && (event.data.type === 'scanHangoutsDOM')) {
    chrome.runtime.sendMessage({
      event: 'scanHangoutsDOM',
      data: ''
    });
  }

  // App is requesting hangouts friends
  if (event.data.type && (event.data.type === 'readHangoutsMessages')) {
    chrome.runtime.sendMessage({
      event: 'readHangoutsMessages',
      data: {
        to: event.data.to,
      }
    });
  }

  // App is sending hangouts message
  if (event.data.type && (event.data.type === 'sendHangoutsMessage')) {
    chrome.runtime.sendMessage({
      event: 'sendHangoutsMessage',
      data: {
        to: event.data.to,
        text: event.data.text
      }
    });
  }
    
});
