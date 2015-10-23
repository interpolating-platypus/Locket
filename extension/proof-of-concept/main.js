// document.body.style.background = 'yellow';
console.log('main');

// Receive update from background process
chrome.runtime.onMessage.addListener(function(message) {
  if (message.event === "receivedNewMessage") {
    console.log('received new message event trigger');
    window.postMessage({ type: 'receivedNewMessage', text: message.data}, "*");
  }
  // Received facebook friends list
  if (message.event === "facebookFriendsList") {
    // Emit the facebook friends list to the extension
    window.postMessage({ type: 'facebookFriendsList', text: message.data}, "*");
  }
});

// Register the tabid with the background process
chrome.runtime.sendMessage({
  event: 'registerTabId',
  data: 'webapp'
});

// Listen to requests from web application
window.addEventListener('message', function(event) {
  console.log('NEW EVENT fb iframe', event.data.type);
  if (event.source != window)
    return;
  if (event.data.type && (event.data.type == 'getFacebookFriends')) {
    console.log('Getting Facebook Friends');
    chrome.runtime.sendMessage({
      event: 'getFacebookFriends',
      data: ''
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
