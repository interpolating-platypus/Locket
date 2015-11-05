//### Runs in the facebook messenger iFrame
//**Is repsonsible primarily for reading from and writing to the Facebook Messenger DOM**
var backgroundCheckInterval = 500;
var rescanDOMInterval = 500;
var seenMessageGroup = {};
var usersWithNewMessages = [];
var messagesToPost = {};
var keyExchanges = {};
var usersToClick = [];
var scanDOM = true;
var maxFacebookFriends = 15;

$(document).ready(function() {
  // Retrieve the depth of the iFrame
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

    // Retrieves list of most-recently talked-with facebook friends
    var getFacebookFriends = function() {
      var friendObjs = $('._k_');
      var results = [];
      friendObjs.each(function(idx) {
        if (idx < maxFacebookFriends) {
          var link = $(this).attr('href');
          var span = $(this).find('._l2 ._l1');
          results.push({
            username: link.replace('https://www.facebook.com/messages/', ''),
            name: span.text()
          });
        }
      });

      return results;
    };

    // Checks for mew messages from background process
    var checkWithBackgroundProcess = function() {
      chrome.runtime.sendMessage({event: 'updateStatus' }, 
        function(response) {
          // Background process wants to post a message through facebook
          if (response.postMessages.length) {
            for (var i = 0; i < response.postMessages.length; i++) {
              var message = response.postMessages[i];

              // Stores the messages to be sent
              messagesToPost[message.to] = messagesToPost[message.to] || [];
              messagesToPost[message.to].push(message.text);

              // Stores users to navigate to in order to send messages
              if (usersToClick.indexOf(message.to) === -1) {
                usersToClick.push(message.to);
              }
            }
          }

          // Background process wants us to initiate a key exchange
          if (response.sendPublicKey.length !== 0) {
            for (var i = 0; i < response.sendPublicKey.length; i++) {
              var keyReq = response.sendPublicKey[i];

              // Marks that we want to initiate a key exchange with this user
              // keyReq.friendKey is what the sending user thinks the recipient's key is
              keyExchanges[keyReq.to] = keyReq.publicKey + "*****Your Key Below******" + keyReq.friendKey + "END KEYSHARE";
              if (usersToClick.indexOf(keyReq.to) === -1) {
                usersToClick.push(keyReq.to);
              }
            }
          }

          // Background process wants to get facebook friends
          if (response.getFriends) {
            // Retrieves friends from facebook DOM
            var friends = getFacebookFriends();
            // Sends these friends to the background process
            chrome.runtime.sendMessage({
              event: 'facebookFriendsList',
              data: friends
            });
          }

          // Background process wants us to read messages for specific fb user (prev chat)
          if (response.readFacebookMessages.length !== 0) {
            for (var i = 0; i < response.readFacebookMessages.length; i++) {
              usersToClick.push(response.readFacebookMessages[i]);
            }
          }

          // Background process wants us emit a disconnect message to our encrypted facebook friends
          if (response.emitDisconnect.length !== 0) {
            for (var i = 0; i < response.emitDisconnect.length; i++) {
              var username = response.emitDisconnect[i];
              usersToClick.push(username);
              messagesToPost[username] = messagesToPost[username] || [];
              messagesToPost[username].push("*****USER DISCONNECT*****");
            }
          }

          // Background process wants us to change status of DOM monitoring
          scanDOM = response.scanDOM;
        }
      );
    }

    // Checks for new messages from facebook DOM
    var rescanFacebookDom = function() {
      // Checks for new messages from the active user
      $('#webMessengerRecentMessages li').each(function(idx) {
        var texts = $(this).find('p');
        var id = $(this).attr('id');
        seenMessageGroup[id] = seenMessageGroup[id] || [];

        // Handles any new messages
        if (id && seenMessageGroup[id].length !== texts.length) {
          var newTexts = [];
          // The pgp key is split into multiple messages
          var partialPGPKey = ''; 
          var context = this;
          texts.slice(seenMessageGroup[id].length).each(function(index) {
            if (partialPGPKey) {
              var text = $(this).text();
              partialPGPKey += '\n\n' + text;
              if (text.slice(text.length-12) === 'END KEYSHARE') {
              
                var pgpKeys = partialPGPKey.split('*****Your Key Below******');
                //index 0 = sender's key, index 1 = what the sender has stored as recipient's key
                var friendKey = pgpKeys[1].substring(0, pgpKeys[1].length-12);
                var activeUsername = getActiveUsername();
                var activeName = getActiveName();
                var sentBy = getSender(context, activeUsername);

                if(sentBy !== 'me'){
                  chrome.runtime.sendMessage({
                    event: 'receivedPGPKey',
                    data: {
                      publicKey: pgpKeys[0],
                      // friendKey is what the friend thinks this user's current key is
                      friendKey: friendKey,
                      from: activeUsername,
                      name: activeName
                    }
                  });
                }

                partialPGPKey = '';
              }

            }
            // This is the pgp key header; the next text is a continuation of the pgp key
            else if ($(this).text().substr(0,36) === '-----BEGIN PGP PUBLIC KEY BLOCK-----') {
              partialPGPKey = $(this).text();
            }
            // This is a standard message to be sent back to the client
            else {
              newTexts.push($(this).text());
            }
          });

          if (newTexts.length) {
            // Retrieves the facebook username
            var activeUsername = getActiveUsername();
            var activeName = getActiveName();
            var sentBy = getSender(this, activeUsername);

            // Handles sending of new messages to the client here
            chrome.runtime.sendMessage({event: 'receivedNewFacebookMessage', data: {with: activeUsername, name: activeName, from: sentBy, text: newTexts}});
          }
          seenMessageGroup[id] = texts;
        }
      });

      // Sends any queued messages / key exchanges for this user
      var activeUsername = getActiveUsername();
      // Sends any queued key exchanges to this user
      if (keyExchanges[activeUsername] && keyExchanges[activeUsername].length) {
        var message = keyExchanges[activeUsername];
        postFacebookMessage(message);
        delete keyExchanges[activeUsername];
      }

      // Sends any queued messages to this user
      if (messagesToPost[activeUsername] && messagesToPost[activeUsername].length !== 0) {
        while (messagesToPost[activeUsername].length) {
          var message = messagesToPost[activeUsername].shift();
          postFacebookMessage(message);
        }
      }

      // Checks for new messages from non-active users
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

      // Navigates to the non-active user with a new message
      if (usersToClick.length !== 0) {
        // Retrieves the link for that username
        var usernameToClick = usersToClick.shift();
        $('._k_').each(function() {
          var username = $(this).attr('href').replace('https://www.facebook.com/messages/','');
          if (username === usernameToClick) {
            // Clicks the username
            this.click();
          }
        });
      }
    };

    // Periodically checks with the background process for new instructions
    setInterval(checkWithBackgroundProcess, backgroundCheckInterval);

    // Periodically checks whether it's no longer in use and should be turned off
    setInterval(function() {
      if (scanDOM || usersToClick.length || messagesToPost.length) {
        rescanFacebookDom();
      } else {
        chrome.runtime.sendMessage({event: 'turnOff' });
      }
    }, rescanDOMInterval);
  }

  // Posts a message on Facebook through the DOM
  function postFacebookMessage(message) {
    document.getElementsByName('message_body')[0].value = message;
    $('input[value="Reply"]').click();
  }

  // Retrieves the username of a sender of a message
  function getSender(context, activeUsername) {
    return $(context).find('a').first().attr('href').replace('https://www.facebook.com/','').replace('profile.php?id=','') === activeUsername ? activeUsername : 'me';
  }

  // Retrieves the username of the person being talked to
  function getActiveUsername() {
    var activeUsername = $('._r7').find('a').attr('href').replace('https://www.facebook.com/','').replace('profile.php?id=','');
    return activeUsername;
  }

  // Returns the name of the person being talked to
  function getActiveName() {
    return $('._r7').find('a').text();
  }
});


