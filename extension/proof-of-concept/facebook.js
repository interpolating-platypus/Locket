// document.body.style.background = 'yellow';
console.log('facebook');
var backgroundCheckInterval = 1000;

$(document).ready(function() {

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
