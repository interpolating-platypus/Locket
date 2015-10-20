console.log('facebook');
var backgroundCheckInterval = 1000;
var rescanDOMInteral = 3000;
var seenMessageGroup = {};

$(document).ready(function() {

  // Check for mew messages from background process
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

  // Check for new messages from facebook DOM
  var rescanFacebookDom = function() {
    $('#webMessengerRecentMessages li').each(function(idx) {
      //console.log($(this).find('p').text());
      var texts = $(this).find('p');
      var id = $(this).attr('id');
      seenMessageGroup[id] = seenMessageGroup[id] || [];
      if (id && seenMessageGroup[id].length !== texts.length) {
        //var newText = text.substr(seenMessageGroup[id].length);
        var newTexts = [];
        texts.slice(seenMessageGroup[id].length).each(function() {
          newTexts.push($(this).text());
        });
        console.log('NEW MESSAGE', newTexts);
        // handle sending of new message to the client here
        chrome.runtime.sendMessage({event: 'receivedNewMessage', data: newTexts});
        seenMessageGroup[id] = texts;
      }
    });
  };

  setInterval(checkWithBackgroundProcess, backgroundCheckInterval);
  setInterval(rescanFacebookDom, rescanDOMInteral);
});
