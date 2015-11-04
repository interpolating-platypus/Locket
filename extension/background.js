console.log('background');

chrome.webRequest.onHeadersReceived.addListener(
    function(info) {
        var headers = info.responseHeaders;
        for (var i=headers.length-1; i>=0; --i) {
            var header = headers[i].name.toLowerCase();
            if (header == 'x-frame-options' || header == 'frame-options') {
                headers.splice(i, 1); // Remove header
            }
        }
        return {responseHeaders: headers};
    },
    {
        urls: [ '*://*/*' ], // Pattern to match all http(s) pages
        types: [ 'sub_frame' ]
    },
    ['blocking', 'responseHeaders']
);

var mainTabId;
var unreadMessages = []; // Messages loaded by facebook.js awaiting main.js connection
var stillAlive;
var stillAliveRefresh = 1000;
var stillAliveMaximum = 7000;

// Store any actions that need to be taken by the facebook script
var encryptedFriends = [];
var facebookTODO = {
  postMessages: [],
  getFriends: false,
  scanDOM: false,
  sendPublicKey: [],
  readFacebookMessages: [],
  emitDisconnect: []
};

var hangoutsTODO = {
  getFriends: false,
  getMessagesFor: [],
  postMessages: [],
  sendPublicKey: [],
  emitDisconnect: []
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // This event is issued when we are to inject the facebook content script
  if (message.event === 'injectIframes') {
    document.getElementById('iframe').src = 'https://facebook.com/messages/';
    document.getElementById('hangoutsIframe').src = 'https://hangouts.google.com/';
    chrome.tabs.sendMessage(sender.tab.id, {event: 'stillAlive', data: ''});
    stillAlive = Date.now();

    // Emit periodic poll to content script
    var pollContentScript = function() {
      chrome.tabs.sendMessage(sender.tab.id, {event: 'stillAlive', data: ''});
      setTimeout(pollContentScript, stillAliveRefresh);
    };
    pollContentScript();

    // If content script hasn't responded, emit disconnect
    var checkContentScriptTimeout = function() {
      // If too much time has elapsed, we've disconnected, turn off scanning of DOM
      if (Date.now() - stillAlive > stillAliveMaximum) {
        // Add functionality here
        console.log("Disconnected! Sending messages to ", encryptedFriends);
        facebookTODO.scanDOM = false;
        facebookTODO.emitDisconnect = encryptedFriends.filter(function(val){
          return val.service === "Facebook";
        }).map(function(val){
          return val.username;
        });
        hangoutsTODO.emitDisconnect = encryptedFriends.filter(function(val){
          return val.service === "Hangouts";
        }).map(function(val){
          return val.username;
        });

      } else {
        setTimeout(checkContentScriptTimeout, stillAliveRefresh);
      }
    };
    checkContentScriptTimeout();
  }

  if (message.event === 'stillAlive') {
    stillAlive = Date.now();
  }
  if (message.event === 'encryptedFriends') {
    stillAlive = Date.now();
    encryptedFriends = message.data;
  }

  // This event is issued when the main content script is launched
  if (message.event === "registerTabId") {
    mainTabId = sender.tab.id;

    // Send any unread messages to the client
    if (unreadMessages.length) {
      chrome.tabs.sendMessage(mainTabId, {event: "receivedNewFacebookMessage", data: unreadMessages});
    }
  }

  // Turn off the iFrame when all disconnect messages have been sent
  if (message.event === "turnOff" && Date.now() - stillAlive > stillAliveMaximum) {
    document.getElementById('iframe').src = '';
  }
  // The facebook content script is requesting any new actions to be taken
  if (message.event === "updateStatus") {
    sendResponse({
      postMessages: facebookTODO.postMessages.slice(),
      getFriends: facebookTODO.getFriends,
      scanDOM: facebookTODO.scanDOM,
      sendPublicKey: facebookTODO.sendPublicKey,
      readFacebookMessages: facebookTODO.readFacebookMessages,
      emitDisconnect: facebookTODO.emitDisconnect
    });

    // TODO: modularize this so it's a 1-line reset to defaults
    facebookTODO.postMessages = [];
    facebookTODO.getFriends = false;
    facebookTODO.sendPublicKey = [];
    facebookTODO.readFacebookMessages = [];
    facebookTODO.emitDisconnect = [];
  }

  // The facebook script has read in new messages
  if (message.event === "receivedNewFacebookMessage") {
    // if the client is already on our app, send the new messages
    if (mainTabId) {
      chrome.tabs.sendMessage(mainTabId, {event: 'receivedNewFacebookMessage', data: message.data});
    }

    // Otherwise, store the new messages for the future
    else {
      unreadMessages = unreadMessages.concat(message.data);
    }
  }

  // The content script is asking for facebook friends
  if (message.event === "getFacebookFriends") {
    facebookTODO.getFriends = true;
  }

  // The facebook script has sent us back its friendslist
  if (message.event === "facebookFriendsList") {
    // Send the friendslist back to the content script (for relay to the app)
    chrome.tabs.sendMessage(mainTabId, {event: 'facebookFriendsList', data: message.data});
  }

  // The content script is giving us a message to send over facebook
  if (message.event === "sendFacebookMessage") {
    facebookTODO.postMessages.push(message.data);
  }

  // The content script is telling us to tell the Facebook script to monitor the DOM
  if (message.event === 'scanFacebookDOM') {
    facebookTODO.scanDOM = true;
  }

  // The content script is telling us to initiate a public key exchange
  if (message.event === 'sendPublicKey') {
    console.log("sending " + message.data.service + " public key");
    if(message.data.service === "Facebook"){
      facebookTODO.sendPublicKey.push(message.data);
    }else if (message.data.service === "Hangouts"){
      hangoutsTODO.sendPublicKey.push(message.data);
    }
  }

  // The facebook script has sent us a PGP key
  if (message.event === 'receivedPGPKey') {
    chrome.tabs.sendMessage(mainTabId, {event: 'receivedPGPKey', data: message.data});
  }

  // The content script is telling us to read facebook messages for a certain user
  if (message.event === 'readFacebookMessages') {
    facebookTODO.readFacebookMessages.push(message.data.to);
  }


  //BEGIN HANGOUTS LOGIC
  //received hangouts friends list from hangouts iframe
  if (message.event === "hangoutsFriendsList") {
    // Send the friendslist back to the content script (for relay to the app)
    chrome.tabs.sendMessage(mainTabId, {event: 'hangoutsFriendsList', data: message.data});
  }

  //hangouts.js has read new messages and would like to send them to the client
  if (message.event === "receivedNewHangoutsMessage") {
    // if the client is already on our app, send the new messages
    if (mainTabId) {
      chrome.tabs.sendMessage(mainTabId, {event: 'receivedNewHangoutsMessage', data: message.data});
    }

    // Otherwise, store the new messages for the future
    else {
      unreadMessages = unreadMessages.concat(message.data);
    }
  }

  // The hangouts content script is requesting instructions
  if (message.event === "getHangoutsInstructions") {
    sendResponse({
      getFriends: hangoutsTODO.getFriends,
      getMessagesFor: hangoutsTODO.getMessagesFor,
      postMessages: hangoutsTODO.postMessages,
      sendPublicKey: hangoutsTODO.sendPublicKey,
      emitDisconnect: hangoutsTODO.emitDisconnect
    });

    hangoutsTODO.getFriends = false;
    hangoutsTODO.getMessagesFor = [];
    hangoutsTODO.postMessages = [];
    hangoutsTODO.sendPublicKey = [];
    hangoutsTODO.emitDisconnect = [];
  }

  // The web app is telling us to read hangouts messages for a certain user
  if (message.event === 'readHangoutsMessages') {
    console.log("getting hangouts messages");
    hangoutsTODO.getMessagesFor.push(message.data.to);
  }

  // The web app is asking for facebook friends
  if (message.event === "getHangoutsFriends") {
    hangoutsTODO.getFriends = true;
  }

  // The web app is giving us a message to send over hangouts
  if (message.event === "sendHangoutsMessage") {
    hangoutsTODO.postMessages.push(message.data);
  }
});
