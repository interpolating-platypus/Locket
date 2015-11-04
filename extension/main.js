// document.body.style.background = 'yellow';
console.log('main');

// User navigated to our service. Tell our app to start up the facebook background script
chrome.runtime.sendMessage({ event: 'injectIframes', data: '' });

// Receive update from background processes
chrome.runtime.onMessage.addListener(function(message) {
  if (message.event === 'stillAlive') {
    // Change the above to instead talk to the app requesting the active fb enc chats
    // Then listen to the response from the app, and send that response to the background
    chrome.runtime.sendMessage({ event: 'stillAlive', data: '' });
    window.postMessage({ type: 'getEncryptedFriends'}, "*");
  }

  // Received a new facebook message
  if (message.event === "receivedNewFacebookMessage") {
    window.postMessage({ type: 'receivedNewFacebookMessage', text: message.data}, "*");
  }

  // Received facebook friends list
  if (message.event === "facebookFriendsList") {
    // Emit the facebook friends list to the extension
    window.postMessage({ type: 'facebookFriendsList', text: message.data}, "*");
  }

  // Received facebook/hangouts PGP key
  if (message.event === 'receivedPGPKey') {
    console.log('Received FB PGP Key (main)');
    window.postMessage({ type: 'receivedPGPKey', text: message.data}, "*");
  }

  //BEGIN HANGOUTS LOGIC

  // Received hangouts friends list
  if (message.event === "hangoutsFriendsList") {
    // Emit the hangouts friends list to the extension
    window.postMessage({ type: 'hangoutsFriendsList', text: message.data}, "*");
  }

  // Received a new hangouts message
  if (message.event === "receivedNewHangoutsMessage") {
    window.postMessage({ type: 'receivedNewHangoutsMessage', text: message.data}, "*");
  }
});

// Register the tabid with the background process
chrome.runtime.sendMessage({
  event: 'registerTabId',
  data: 'webapp'
});

// Listen to requests from web app
window.addEventListener('message', function(event) {
  if (event.source != window)
    return;

  // Listening for a list of active encrypted Facebook sessions
  if (event.data.type && (event.data.type === 'encryptedFriends')) {
    chrome.runtime.sendMessage({
      event: 'encryptedFriends',
      data: event.data.text
    });
  }

  //Checking if user has extension
  if (event.data.type && (event.data.type === 'checkExtension')) {
    window.postMessage({ type: 'extensionExists', text: ''}, "*");
  }

  // App requesting facebook friends
  if (event.data.type && (event.data.type === 'getFacebookFriends')) {
    chrome.runtime.sendMessage({
      event: 'getFacebookFriends',
      data: ''
    });
  }

  // App telling us to begin the DOM scan
  if (event.data.type && (event.data.type === 'scanFacebookDOM')) {
    chrome.runtime.sendMessage({
      event: 'scanFacebookDOM',
      data: ''
    });
  }

  // App sending facebook message
  if (event.data.type && (event.data.type === 'sendFacebookMessage')) {
    chrome.runtime.sendMessage({
      event: 'sendFacebookMessage',
      data: {
        to: event.data.to,
        text: event.data.text
      }
    });
  }
  
  // App requesting a key exchange
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

  // App requesting us to read facebook messages for clicked-on user
  if (event.data.type && (event.data.type === 'readFacebookMessages')) {
    chrome.runtime.sendMessage({
      event: 'readFacebookMessages',
      data: {
        to: event.data.to,
      }
    });
  }

  //BEGIN HANGOUTS LOGIC

  // App requesting hangouts friends
  if (event.data.type && (event.data.type === 'getHangoutsFriends')) {
    chrome.runtime.sendMessage({
      event: 'getHangoutsFriends',
      data: ''
    });
  }

  // App requesting hangouts friends
  if (event.data.type && (event.data.type === 'readHangoutsMessages')) {
    chrome.runtime.sendMessage({
      event: 'readHangoutsMessages',
      data: {
        to: event.data.to,
      }
    });
  }

  // App sending hangouts message
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

// PROOF OF CONCEPT MESSAGE SENDING & RECEIPT
// window.addEventListener("message", function(event) {
//   // We only accept messages from ourselves
//   if (event.source != window)
//     return;
// 
//   if (event.data.type && (event.data.type == "FROM_PAGE")) {
//     console.log("Content script received (main_js): " + event.data.text);
//     window.postMessage({ type: "FROM_EXT", text: "Hello from the ext!" }, "*");
//   }
// }, false);
