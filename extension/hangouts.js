//This is the interval at which we perform actions
var rescanDOMInterval = 500;
//This object maps users to their corresponding button in the friends list
var userToButtonMap = {};
//This object stores the message block id's of seen messages
var seenMessageGroup = {};
//This object stores friends which have new messages needing to be read
var friendsWithNewMessages = {};
//These are used to interact with the correct DOM Elements
var elementIdentifiers = {
  //Iframe id containing friends list
  friendsListIframeId: '#gtn-roster-iframe-id-b',
  //Class for button in friends list. Clicking invokes chat window
  friendsListIframeButton: '.Bb',
  //Friends names are listed in the friends list at the element with this class
  friendsListNameClass: '.mG',
  //Class signifying there are unread messages from this user. This is intentionally without the "." because the function calling it uses JQuery's 'hasClass' method
  friendsListUnreadMessagesClass: 'ee',
  //Username that appears at top of chat
  chatWindowRecipient: '.Ob2Lud',
  //Class of iframe containing chat window
  chatWindowIframeClass: '.talk_chat_widget',
  //Messages are grouped into to/from blocks
  chatWindowChatBlockClass: '.tk',
  //Chat windows have an area to type in text
  chatWindowTextarea: '.vE',
  //There is no visible submit button, but the one that appears when you upload a photo works for text as well
  chatWindowSubmitButton: '.NQ0ZIe',
  //Chat blocks are tagged with who sent the messages
  chatBlockFromClass: '.UR',
  //Chat blocks may contain multiple messages
  chatBlockMessageClass: '.Mu',
}

$(document).ready(function () {
  //hangouts.google.com loads additional iframes with the same domain. This is to make sure we only run this content script in the main hangouts page
  var getFrameDepth = function (winToID) {
    try{
      console.log(winToID.parent.src);
    }catch (e) {
      console.log(e);
    }

    if (winToID === window.top) {
      return 0;
    } else if (winToID.parent === window.top) {
      return 1;
    }
    return 1 + getFrameDepth (winToID.parent);
  }
  if (getFrameDepth(window.self) !== 1) {
    //We are in a nested iframe and don't want to run this content script
    return;
  }
  //This function will attempt to load the friends list until it loads
  getHangoutsFriends(-5)
    .then(function(friends){
      //Once we have loaded all of the friends, we want to open all chat windows
      openAllChatWindows();
      //On each interval we want to check for instructions
      setInterval(function () {
        onIntervals();
      }, rescanDOMInterval);
    });

});

//In each interval we check for instructions from background.js. Extensions cannot send messages to content scripts, only respond to messages sent from content scripts
function onIntervals ( ) {
  //Poll extension for instructions from web app
  chrome.runtime.sendMessage({event: 'getHangoutsInstructions' }, 
    function(response) {
      //Background process wants to get hangouts friends
      if (response.getFriends) {
        //Retrieve friends from hangouts DOM
        findAndSendHangoutsFriends();
      }

      //Background process wants us to read messages for specific hangouts user
      if (response.getMessagesFor.length > 0) {
        for (var i = 0; i < response.getMessagesFor.length; i++) {
          friendsWithNewMessages[response.getMessagesFor[i]] = true;
        }
      }

      //Background process wants us to send the following messages
      if (response.postMessages.length > 0){
        for (var i = 0; i < response.postMessages.length; i++) {
          sendFriendMessage(response.postMessages[i].to, response.postMessages[i].text);
        };
      }

      //Background process wants us to send this user's public key to a specific hangouts user
      if(response.sendPublicKey.length > 0){
        for (var i = 0; i < response.sendPublicKey.length; i++) {
          var keyReq = response.sendPublicKey[i];

          // Mark that we want to initiate a key exchange with this user
          var keys = keyReq.publicKey + "*****Your Key Below******" + keyReq.friendKey + "END KEYSHARE";//keyReq.friendKey is what the sending user thinks the recipient's key is
          sendFriendMessage(keyReq.to, keys);
        }
      }

      //If the user closes the web app, we want to notify the users they were communicating with that they will no longer receive messages encrypted with their key
      if(response.emitDisconnect.length > 0){
        for (var i = 0; i < response.emitDisconnect.length; i++) {
          var username = response.emitDisconnect[i];
          sendFriendMessage(username,"*****USER DISCONNECT*****");
        }
      }

      //When the user closes the web app we want to stop loading their messages in the iframe
      if(response.scanDOM){
        findAndSendUnreadMessages();
      }else{
        chrome.runtime.sendMessage({event: 'turnOff' });
      }
    }
  );
};

//Helper functions

//The friends list is stored in an iframe which takes some time to load. This function will attempt to load the friends list until the number of attempts is equal to 5
function getHangoutsFriends (attempts) {  
  var maxAttempts = 5;

  var deferred = D();

  var friendObjs = $(elementIdentifiers.friendsListIframeId).contents().find(elementIdentifiers.friendsListIframeButton);
  
  //If the content script is unable to load the friends list we can assume the iframe has not loaded yet
  if(friendObjs.length === 0){

    if(attempts === maxAttempts){
      deferred.reject("failed to load friends list")
    }else{
      setTimeout(function(){
        deferred.resolve(getHangoutsFriends(attempts+1));
      },1500);
    }

  }else{

    var friends = [];

    //For each friend in the friends list we want to get their name
    friendObjs.each(function () {
      //Each button in friends list has the friend's name listed
      var name = $(this).find(elementIdentifiers.friendsListNameClass).text();

      friends.push({
        username: name,
        name: name
      });

      //We need to track the button for this user so that we can invoke the corresponding chat window
      userToButtonMap[name] = {
        button: $(this),
        uri: $(this)[0].baseURI
      };

      //While we scan the friends list we can see if there are new messages from anyone
      if($(this).hasClass(elementIdentifiers.friendsListUnreadMessagesClass)){
        friendsWithNewMessages[name] = true;
        //Opening the user's window will mark the message as read so it will not be marked to be read repeatedly
        userToButtonMap[name].button.click();
      }
    });

    deferred.resolve(friends);
  
  }

  return deferred.promise;
};

//There are many iframes open with each of the chat windows. This function will return the chat window of name given
function findFriendChatWindow (name) {  
  var friendChatWindow = null;
  var deferred = D();

  //Iterate through all of the chat windows
  $(elementIdentifiers.chatWindowIframeClass).each(function () {
    var chatWindow = $(this).find('iframe');
    //The person we are chatting with has their name at the top of the chat window
    var recipient = chatWindow.contents().find(elementIdentifiers.chatWindowRecipient).text();

    if (recipient === name) {
      friendChatWindow = chatWindow;
      deferred.resolve(chatWindow);
    }
  });

  //If the friend's chat window cannot be found we need to open it
  if(friendChatWindow === null){
    userToButtonMap[name].button.click();

    setTimeout(function(){
      deferred.resolve(findFriendChatWindow(name));
    }, 200);
  }

  return deferred.promise;
};

//This function will return any new messages from the given user
function findFriendNewMessages (name) {
  var deferred = D();
  findFriendChatWindow(name)
    .then(function(chatWindow){

      var newMessages = [];

      chatWindow.contents().find(elementIdentifiers.chatWindowChatBlockClass).each(function(){

        var id = $(this).attr('id');
        var from = $(this).find(elementIdentifiers.chatBlockFromClass).text();

        //From is empty when you sent the message
        if(!from){
          from = "me";
        }
        
        var chatBlockMessages = $(this).find(elementIdentifiers.chatBlockMessageClass);
        //If we havent seen this chat block id, or the length of messages within this block has increased we know we have new messages
        if (!seenMessageGroup[id] || seenMessageGroup[id] !== chatBlockMessages.length) {
          var newMessagesContent = [];

          //We can slice from the previous length to only get new messages
          chatBlockMessages.slice(seenMessageGroup[id]).each(function(){
            var message = $(this).text();

            if(message.substring().substr(0,36) === '-----BEGIN PGP PUBLIC KEY BLOCK-----'){
              var pgpKeys = message.split('*****Your Key Below******');
              var friendKey = pgpKeys[1].substring(0, pgpKeys[1].length-12);
              //If the PGP key wasn't sent by this user we want to send it to the web app
              if(from !== 'me'){
                chrome.runtime.sendMessage({
                  event: 'receivedPGPKey',
                  data: {
                    publicKey: pgpKeys[0],
                    //friendkey is what the friend thinks this user's current key is
                    friendKey: friendKey,
                    from: name,
                    name: name 
                  }
                });
              }

            }else{
              newMessagesContent.push(message);
            }

          });

          //Push new messages to the array this function returns
          newMessages.push({
            from: from,
            messages: newMessagesContent
          });

        }
        //Update the number of messages we have seen in this block
        seenMessageGroup[id] = chatBlockMessages.length;

      });

      deferred.resolve(newMessages);
    });

  return deferred.promise;
};

//This function will send a message given the name of the friend, and the message to be sent
function sendFriendMessage (name, message){
  findFriendChatWindow(name).then(function(chatWindow){
    chatWindow.contents().find(elementIdentifiers.chatWindowTextarea).text(message);
    chatWindow.contents().find(elementIdentifiers.chatWindowSubmitButton).click();
    friendsWithNewMessages[name] = true;
  });
};

//This function will find all unread messages and send them to the web app
function findAndSendUnreadMessages () {
  getHangoutsFriends(0)
    .then(function () {

      //At this point we have updated the friendsWithNewMessages object and need to send them to the web app
      for(var friend in friendsWithNewMessages){
        findFriendNewMessages(friend)
          .then(function (newMessages) {
            for (var i = 0; i < newMessages.length; i++){
              chrome.runtime.sendMessage({
                event: 'receivedNewHangoutsMessage', 
                data: {
                  with: friend, 
                  name: friend, 
                  from: newMessages[i].from, 
                  text: newMessages[i].messages
                }
              });
              
            }
          });
        delete friendsWithNewMessages[friend];
      }

    },function (err) {
      console.log(err);
    });
};

//This function gets all of the friends from the friends list and sends them to the web app
function findAndSendHangoutsFriends () {
  getHangoutsFriends(0)
    .then(function (friends) {

      chrome.runtime.sendMessage({
        event: 'hangoutsFriendsList',
        data: friends
      });

    },function (err) {
      console.log(err);
    });
};

//This function opens all chat windows so that we can quickly find and send new messages without waiting for the iframes to load
function openAllChatWindows () {
  for(var friend in userToButtonMap){
    userToButtonMap[friend].button.click();
  }
}