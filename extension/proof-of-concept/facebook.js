console.log('facebook');
var backgroundCheckInterval = 500;
var rescanDOMInteral = 500;
var seenMessageGroup = {};
var usersWithNewMessages = [];
var messagesToPost = {};
var keyExchanges = {};
var usersToClick = [];
var scanDOM = false;

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
          }

          // Background process wants us to initiate a key exchange. Same logic as handling posting of messages
          if (response.sendPublicKey.length !== 0) {
            for (var i = 0; i < response.sendPublicKey.length; i++) {
              var keyReq = response.sendPublicKey[i];

              // Mark that we want to initiate a key exchange with this user
              keyExchanges[keyReq.to] = keyReq.publicKey; 
              if (usersToClick.indexOf(keyReq.to) === -1) {
                usersToClick.push(keyReq.to);
              }
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
          // Background process wants us to begin DOM monitoring
          if (response.scanDOM) {
            scanDOM = true;
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
          var halfpgpkey = ''; // the pgp key gets split into two messages
          var context = this;
          texts.slice(seenMessageGroup[id].length).each(function(index) {
            console.log('TEXT', $(this).text());
            // Sometimes a new message will contain a PGP key
            if (halfpgpkey) {
              var publicKey = halfpgpkey + '\n\n'+$(this).text();
              halfpgpkey = '';

              // Determine who sent the PGP key. 
              var activeUsername = getActiveUsername();
              var sentBy = getSender(context, activeUsername);

              // Only report this PGP key to the client if we did not send it
              console.log('received pgp key (fb) ', sentBy);
              if (sentBy !== 'me') {
                chrome.runtime.sendMessage({
                  event: 'receivedPGPKey',
                  data: {
                    publicKey: publicKey,
                    from: activeUsername
                  }
                });
              }
            }
            // This is the pgp key header; the next text is the pgp key
            else if ($(this).text().substr(0,36) === '-----BEGIN PGP PUBLIC KEY BLOCK-----') {
              halfpgpkey = $(this).text();
            }
            // This is a standard message to be sent back to the client
            else {
              newTexts.push($(this).text());
            }
          });
          if (newTexts.length) {
            // Retrieve the facebook username
            var activeUsername = getActiveUsername();
            var sentBy = getSender(this, activeUsername);

            // handle sending of new messages to the client here
            chrome.runtime.sendMessage({event: 'receivedNewFacebookMessage', data: {with: activeUsername, from: sentBy, text: newTexts}});
          }
          seenMessageGroup[id] = texts;
        }
      });

      // Send any queued messages / key exchanges for this user
      var activeUsername = getActiveUsername();
        //$('._r7').find('a').attr('href').replace('https://www.facebook.com/','');

      // Send any queued key exchanges to this user
      if (keyExchanges[activeUsername] && keyExchanges[activeUsername].length) {
        var message = keyExchanges[activeUsername];
        postFacebookMessage(message);
        delete keyExchanges[activeUsername];
      }

      // Send any queued messages to this user
      if (messagesToPost[activeUsername] && messagesToPost[activeUsername].length !== 0) {
        console.log('queued message to this user');
        // In a while loop in case more messages are received while we are sending messages
        while (messagesToPost[activeUsername].length) {
          var message = messagesToPost[activeUsername].shift();
          postFacebookMessage(message);
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
    };

    setInterval(checkWithBackgroundProcess, backgroundCheckInterval);
    setInterval(function() {
      if (scanDOM) {
        rescanFacebookDom();
      }
    }, rescanDOMInteral);
  }

  function postFacebookMessage(message) {
    document.getElementsByName('message_body')[0].value = message;
    $('input[value="Reply"]').click();
    //document.getElementById('u_0_r').click();
  }
  function getSender(context, activeUsername) {
    return $(context).find('a').first().attr('href').replace('https://www.facebook.com/','') === activeUsername ? activeUsername : 'me';
  }
  function getActiveUsername() {
    return $('._r7').find('a').attr('href').replace('https://www.facebook.com/','').replace('profile.php?id=','');
  }
});


