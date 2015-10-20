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
var unsentMessages = []; // Messages we're going to send out over facebook
var unreadMessages = []; // Messages loaded by facebook.js awaiting main.js connection

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (message.event === "registerTabId") {
    mainTabId = sender.tab.id;
    // If there are any messages they haven't seen, send em
    if (unreadMessages.length) {
      chrome.tabs.sendMessage(mainTabId, {event: "receivedNewMessage", data: unreadMessages});
    }
  }
  if (message.event === "sendNewMessage") {
    unsentMessages.push(message.data);
  }
  if (message.event === "updateStatus") {
    sendResponse({
      postMessages: unsentMessages.slice()
    });
    unsentMessages = [];
  }
  if (message.event === "receivedNewMessage") {
    // if they're already on our app, send the new messages
    if (mainTabId) {
      chrome.tabs.sendMessage(mainTabId, {event: 'receivedNewMessage', data: message.data});
    }
    // Otherwise, store them for the future
    else {
      unreadMessages = unreadMessages.concat(message.data);
    }
  }
});
