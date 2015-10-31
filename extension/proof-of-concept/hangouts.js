var rescanDOMInteral = 1500;
var userToButtonMap = {};
var seenMessageGroup = {};

var elementIdentifiers = {
  //iframe id containing friends list
  friendsListIframeId: '#gtn-roster-iframe-id-b',
  //class for button in friends list. Clicking invokes chat window
  friendsListIframeButton: '.Bb',
  //usernames in friends list are in this type
  friendsListUsernameType: 'span',
  //ignore headers in friends list of this type
  friendsListUsernameIgnoreClass: 'sV',
  //username that appears at top of chat
  chatWindowRecipient: '.Ob2Lud',
  //class of iframe containing chat window
  chatWindowIframeClass: '.talk_chat_widget',
  //messages are grouped into to/from blocks
  chatWindowChatBlockClass: '.tk',
  //chat blocks are tagged with who sent the messages
  chatBlockFromClass: '.UR',
  //chat blocks may contain multiple messages
  chatBlockMessageClass: '.Mu'
}

$(document).ready(function () {
  
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
    console.log("leaving nested iframe");
    return;
  }

  console.log('hangouts');

  setInterval(function () {
    getHangoutsFriends();
    console.log("new messages:",findFriendMessages("Fabiola Gomez"));
    sendFriendMessage("Fabiola Gomez", "This is a test!");
  }, rescanDOMInteral);

});


//helper functions
function getHangoutsFriends () {

  //friends list is stored in an iframe
  var friendObjs = $(elementIdentifiers.friendsListIframeId).contents().find(elementIdentifiers.friendsListIframeButton);
  var friends = [];

  friendObjs.each(function () {
    //each button in friends list has the name listed in its headers
    var headers = $(this).find(elementIdentifiers.friendsListUsernameType);
    if(!$(headers[0]).hasClass(elementIdentifiers.friendsListUsernameIgnoreClass)){

      var name = $(headers[0]).text();
      friends.push({
        username: name,
        name: name
      });

      //we need to track the button for this user so that we can invoke the corresponding chat window
      userToButtonMap[name] = {
        button: $(this),
        uri: $(this)[0].baseURI
      };
    }
  });

  return friends;
};

function findFriendChatWindow (name) {
  var friendChatWindow = null;

  //iterate through all of the chat windows
  $(elementIdentifiers.chatWindowIframeClass).each(function () {
    var chatWindow = $(this).find('iframe');
    //the person we are chatting with has their name at the top of the chat window
    var recipient = chatWindow.contents().find(elementIdentifiers.chatWindowRecipient).text();

    if (recipient === name) {
      friendChatWindow = chatWindow;
    }
  });

  return friendChatWindow;
};

function findFriendMessages (name) {
  var chatWindow = findFriendChatWindow(name);

  var newMessages = [];

  if(chatWindow){

    chatWindow.contents().find(elementIdentifiers.chatWindowChatBlockClass).each(function(){
      var id = $(this).attr('id');
      var from = $(this).find(elementIdentifiers.chatBlockFromClass).text();
      if(!from){
        //from is empty when you sent the message
        from = "me"
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

  }else{

    //open chat window
    userToButtonMap[name].button.click();

    //we need to wait for the chat window to load before trying to get messages again
    //maybe we can promisify the task queue to return the result of calling this function on the next interval?
    return "chatWindow opening";
  }

  return newMessages;
};

function sendFriendMessage (name, message){
  var chatWindow = findFriendChatWindow(name);
  chatWindow.contents().find('.vE').text(message);
  chatWindow.contents().find('.NQ0ZIe').click();
};