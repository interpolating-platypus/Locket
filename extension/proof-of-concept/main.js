// document.body.style.background = 'yellow';
console.log('main');

chrome.runtime.onMessage.addListener(function(message) {
  if (message.event === "receivedNewMessage") {
    console.log('message received im main', message.data);
  }
});

chrome.runtime.sendMessage({
  event: 'registerTabId',
  data: 'webapp'
});

chrome.runtime.sendMessage({
  event: 'sendNewMessage',
  data: 'hello moto'
});
