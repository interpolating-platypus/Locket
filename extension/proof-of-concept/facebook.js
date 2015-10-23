var backgroundCheckInterval = 1000;
var rescanDOMInteral = 3000;
var seenMessageGroup = {};

$(document).ready(function() {
  // Facebook has iFrames. 
  // We only want to execute our code on OUR iFrame (the parent frame)
  // Retrieve the frame depth
  var getFrameDepth = function(winToID) {
    if (winToID === window.top) {
      return 0;
    } else if (winToID.parent === window.top) {
      return 1;
    }
    return 1 + getFrameDepth (winToID.parent);
  }
  // Only inject code into the outermost iFrame
  if (getFrameDepth(window.self) === 1) {
    console.log('facebook iFrame');

    // Retrieves list of most-recently talked-with facebook friends
    var getFacebookFriends = function() {
      var spans = $('._l4').find('._l2 ._l1');
      var results = [];
      spans.each(function() {
        results.push($(this).text());
      });
      return results;
    };

    // Check for mew messages from background process
    var checkWithBackgroundProcess = function() {
      chrome.runtime.sendMessage({event: 'updateStatus' }, 
        function(response) {
          // Background process wants to post a message through facebook
          if (response.postMessages.length) {
            console.log('POST MSGS', response.postMessages);
            for (var i = 0; i < response.postMessages.length; i++) {
               document.getElementsByName('message_body')[0].value = response.postMessages[i].text;
               document.getElementById('u_0_r').click();
            }
          }
          // Background process wants to get facebook friends
          if (response.getFriends) {
            // Retrieve friends from facebook DOM
            var friends = getFacebookFriends();
            // Send to the background process
            chrome.runtime.sendMessage({
              event: 'facebookFriendsList',
              data: friends
            });
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
  }
});
