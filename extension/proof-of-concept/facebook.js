console.log('facebook');
var backgroundCheckInterval = 1000;
var rescanDOMInteral = 3000;
var seenMessageGroup = {};
var usersWithNewMessages = [];

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
      var friendObjs = $('._k_');
      var results = [];
      friendObjs.each(function() {
        var link = $(this).attr('href');
        var span = $(this).find('._l2 ._l1');
        results.push({
          username: link.replace('https://www.facebook.com/messages/', ''),
          name: span.text()
        });
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
      // Check for new messages from non-active users
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
          // Retrieve the facebook username
          var username = window.location.pathname.replace('/messages/','');
          // handle sending of new message to the client here
          chrome.runtime.sendMessage({event: 'receivedNewFacebookMessage', data: {from: username, text: newTexts}});
          seenMessageGroup[id] = texts;
        }
      });
      usersWithNewMessages = [];
      $('._k_').each(function(idx) {
        if ($(this).find('._l6').text().indexOf('new') !== -1) {
          usersWithNewMessages.push(this);
        }
      });
      if (usersWithNewMessages.length !== 0) {
        usersWithNewMessages[0].click();
        usersWithNewMessages.shift();
      }
    };

    setInterval(checkWithBackgroundProcess, backgroundCheckInterval);
    setInterval(rescanFacebookDom, rescanDOMInteral);
  }
});
