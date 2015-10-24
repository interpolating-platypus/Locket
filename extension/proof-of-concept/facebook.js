console.log('facebook');
var backgroundCheckInterval = 500;
var rescanDOMInteral = 500;
var seenMessageGroup = {};
var usersWithNewMessages = [];
var messagesToPost = {};
var usersToClick = [];

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
              var message = response.postMessages[i];
              // Store the messages to be sent
              messagesToPost[message.to] = messagesToPost[message.to] || [];
              messagesToPost[message.to].push(message.text);
              // Store users to navigate to in order to send messages
              if (usersToClick.indexOf(message.to) === -1) {
                usersToClick.push(message.to);
              }
            }

            // NOTE: it's possible that these messages are destined for multiple users
            // for (var i = 0; i < response.postMessages.length; i++) {
              // THIS OLD CODE SENT MESSAGE TO CURRENTLY ACTIVE FB USER
               // document.getElementsByName('message_body')[0].value = response.postMessages[i].text;
               // document.getElementById('u_0_r').click();
            // }
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
      // Check for new messages from the active user
      $('#webMessengerRecentMessages li').each(function(idx) {
        var texts = $(this).find('p');
        var id = $(this).attr('id');
        seenMessageGroup[id] = seenMessageGroup[id] || [];
        // Handle any new messages
        if (id && seenMessageGroup[id].length !== texts.length) {
          var newTexts = [];
          texts.slice(seenMessageGroup[id].length).each(function() {
            newTexts.push($(this).text());
          });
          console.log('NEW MESSAGE', newTexts);
          // Retrieve the facebook username
          var activeUsername = $('._r7').find('a').attr('href').replace('https://www.facebook.com/','');
          // handle sending of new message to the client here
          chrome.runtime.sendMessage({event: 'receivedNewFacebookMessage', data: {from: activeUsername, text: newTexts}});
          seenMessageGroup[id] = texts;

        }
      });

      // Send any queued messages for this user
      var activeUsername = $('._r7').find('a').attr('href').replace('https://www.facebook.com/','');
      console.log('ACTIVE USER', activeUsername);
      if (messagesToPost[activeUsername] && messagesToPost[activeUsername].length !== 0) {
        // In a while loop in case more messages are received while we are sending messages
        while (messagesToPost[activeUsername].length) {
          var message = messagesToPost[activeUsername].shift();
          document.getElementsByName('message_body')[0].value = message;
          document.getElementById('u_0_r').click();
        }
      }

      // Check for new messages from non-active users
      usersWithNewMessages = [];
      $('._k_').each(function(idx) {
        var username = $(this).attr('href').replace('https://www.facebook.com/messages/','');
        if ($(this).find('._l6').text().indexOf('new') !== -1) {
          usersWithNewMessages.push({username: username, link: this});
        }
      });
      // If there are any users with new messages, add them as to-be-clicked-uponn
      if (usersWithNewMessages.length !== 0) {
        if (usersToClick.indexOf(usersWithNewMessages[0].username) === -1) {
          usersToClick.push(usersWithNewMessages[0].username);
        }
      }
      // Navigate to the non-active user with a new message
      if (usersToClick.length !== 0) {
        // Retrieve the link for that username
        var usernameToClick = usersToClick.shift();
        // var usernameToClick = usersToClick[0];
        $('._k_').each(function() {
          var username = $(this).attr('href').replace('https://www.facebook.com/messages/','');
          if (username === usernameToClick) {
            // Click it
            this.click();
          }
        });
      }
        // usersWithNewMessages[0].click();
        // usersWithNewMessages.shift();
    };

    setInterval(checkWithBackgroundProcess, backgroundCheckInterval);
    setInterval(rescanFacebookDom, rescanDOMInteral);
  }
});
