// document.body.style.background = 'yellow';
console.log('facebook');
var backgroundCheckInterval = 1000;

$(document).ready(function() {

  // var test = $('#webMessengerRecentMessages').text();
  // console.log(test);
  // document.getElementsByName('message_body')[0].value = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaah panic';
  // document.getElementById('u_0_r').click();
  // chrome.runtime.sendMessage({
  //   data: test
  // });

  var checkWithBackgroundProcess = function() {
    chrome.runtime.sendMessage({event: 'updateStatus' }, 
      function(response) {
        if (response.postMessages.length) {
          document.getElementsByName('message_body')[0].value = response.postMessages;
          document.getElementById('u_0_r').click();
        }
      }
    );
  }
  setInterval(checkWithBackgroundProcess, backgroundCheckInterval);
});
