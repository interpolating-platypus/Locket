// document.body.style.background = 'yellow';
console.log('main');
$(document).ready(function() {
  var test = $('#webMessengerRecentMessages').text();
  console.log(test);
  chrome.runtime.sendMessage({
    data: test
  });
});
