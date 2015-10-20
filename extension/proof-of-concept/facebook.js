// document.body.style.background = 'yellow';
console.log('facebook');

$(document).ready(function() {
  chrome.runtime.sendMessage({
    event: 'registerTabId',
    data: 'facebook'
  });

  var test = $('#webMessengerRecentMessages').text();
  console.log(test);
  document.getElementsByName('message_body')[0].value = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaah panic';
  document.getElementById('u_0_r').click();
  chrome.runtime.sendMessage({
    data: test
  });

  chrome.runtime.onMessage.addListener(function(text) { 
    console.log(text);
    document.getElementsByName('message_body')[0].value = text;
    document.getElementById('u_0_r').click();
  });
});
