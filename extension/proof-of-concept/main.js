// document.body.style.background = 'yellow';
console.log('main');

chrome.runtime.sendMessage({
  event: 'registerTabId',
  data: 'webapp'
});

chrome.runtime.sendMessage({
  event: 'sendNewMessage',
  data: 'hello moto'
});
