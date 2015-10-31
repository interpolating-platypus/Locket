var rescanDOMInteral = 1500;
var userToButtonMap = {};
var seenMessageGroup = {};
var friendsWithNewMessages = {};

var elementIdentifiers = {
  //iframe id containing friends list
  friendsListIframeId: '#gtn-roster-iframe-id-b',
  //class for button in friends list. Clicking invokes chat window
  friendsListIframeButton: '.Bb',
  //friends names are listed in the friends list at the element with this class
  friendsListNameClass: '.mG',
  //class signifying there are unread messages from this user
  friendsListUnreadMessagesClass: 'ee',//this is intentionally without the "." (function uses JQuery's 'hasClass' method)
  //username that appears at top of chat
  chatWindowRecipient: '.Ob2Lud',
  //class of iframe containing chat window
  chatWindowIframeClass: '.talk_chat_widget',
  //messages are grouped into to/from blocks
  chatWindowChatBlockClass: '.tk',
  //chat windows have an area to type in text
  chatWindowTextarea: '.vE',
  //there is no visible submit button, but the one that appears when you upload a photo works for text as well
  chatWindowSubmitButton: '.NQ0ZIe',
  //chat blocks are tagged with who sent the messages
  chatBlockFromClass: '.UR',
  //chat blocks may contain multiple messages
  chatBlockMessageClass: '.Mu',
}

$(document).ready(function () {
  
  //hangouts loads additional iframes with the same domain. This is to make sure we only run this content script in the main hangouts page
  var getFrameDepth = function (winToID) {
    if (winToID === window.top) {
      return 0;
    } else if (winToID.parent === window.top) {
      return 1;
    }
    return 1 + getFrameDepth (winToID.parent);
  }
  if (getFrameDepth(window.self) !== 0/*change back to 1 after testing*/) {
    //we are in a nested iframe and don't want to run this content script
    return;
  }

  setInterval(function () {
    onIntervals();
  }, rescanDOMInteral);

  getHangoutsFriends(0)
    .then(function (friends) {

      chrome.runtime.sendMessage({
        event: 'hangoutsFriendsList',
        data: friends
      });


      // findFriendMessages("Jose Barrientos").then(function(messages){
      //   console.log(messages);
      // });
      // sendFriendMessage("Jose Barrientos", "This is a test!");
    },function (err) {
      console.log(err);
    });

});

function onIntervals ( ){
  getHangoutsFriends(0)
    .then(function (friends) {
      console.log(friendsWithNewMessages);
    },function (err) {
      console.log(err);
    });
};

//helper functions
function getHangoutsFriends (attempts) {  //friends list is stored in an iframe
  //timeout if we are unable to load friends after 5 attempts
  var maxAttempts = 5;

  var deferred = D();

  var friendObjs = $(elementIdentifiers.friendsListIframeId).contents().find(elementIdentifiers.friendsListIframeButton);
  
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

    friendObjs.each(function () {
      //each button in friends list has the friend's name listed
      var name = $(this).find(elementIdentifiers.friendsListNameClass).text();

      friends.push({
        username: name,
        name: name
      });

      //we need to track the button for this user so that we can invoke the corresponding chat window
      userToButtonMap[name] = {
        button: $(this),
        uri: $(this)[0].baseURI
      };

      //while we scan the friends list we can see if there are new messages from anyone
      if($(this).hasClass(elementIdentifiers.friendsListUnreadMessagesClass)){
        friendsWithNewMessages[name] = true;
      }
    });

    deferred.resolve(friends);
  
  }

  return deferred.promise;
};

function findFriendChatWindow (name) {  var friendChatWindow = null;
  var deferred = D();

  //iterate through all of the chat windows
  $(elementIdentifiers.chatWindowIframeClass).each(function () {
    var chatWindow = $(this).find('iframe');
    //the person we are chatting with has their name at the top of the chat window
    var recipient = chatWindow.contents().find(elementIdentifiers.chatWindowRecipient).text();

    if (recipient === name) {
      deferred.resolve(chatWindow);
    }
  });

  if(friendChatWindow === null){
    //open chat window
    userToButtonMap[name].button.click();

    setTimeout(function(){
      deferred.resolve(findFriendChatWindow(name));
    }, 2000);
  }

  return deferred.promise;
};

function findFriendMessages (name) {
  var deferred = D();
  findFriendChatWindow(name)
    .then(function(chatWindow){

      var newMessages = [];

      chatWindow.contents().find(elementIdentifiers.chatWindowChatBlockClass).each(function(){
        var id = $(this).attr('id');
        var from = $(this).find(elementIdentifiers.chatBlockFromClass).text();
        if(!from){
          //from is empty when you sent the message
          from = "me";
        }
        
        var chatBlockMessages = $(this).find(elementIdentifiers.chatBlockMessageClass);

        //if we havent seen this chat block id, or the length of messages within this block has increased we know we have new messages
        if (!seenMessageGroup[id] || seenMessageGroup[id] !== chatBlockMessages.length) {
          var newMessagesContent = [];

          //we can slice from the previous length to only get new messages
          chatBlockMessages.slice(seenMessageGroup[id]).each(function(){
            newMessagesContent.push($(this).text());
          });

          //push messages to the array this function returns
          newMessages.push({
            from: from,
            messages: newMessagesContent
          });

          //update the number of messages we have seen in this block
          seenMessageGroup[id] = chatBlockMessages.length;
        }

      });

      deferred.resolve(newMessages);
    });

  return deferred.promise;
};

function sendFriendMessage (name, message){
  findFriendChatWindow(name).then(function(chatWindow){
    chatWindow.contents().find(elementIdentifiers.chatWindowTextarea).text(message);
    chatWindow.contents().find(elementIdentifiers.chatWindowSubmitButton).click();
  });
};

function findUnreadMessages (){

};