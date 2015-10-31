var rescanDOMInteral = 1500;
var userToButtonMap = {};

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
  chatWindowIframeClass: '.talk_chat_widget'
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
    console.log(findFriendMessages("Jose Barrientos"));
  }, rescanDOMInteral);

});

var getHangoutsFriends = function () {

  //friends list is stored in an iframe
  var friendObjs = $(elementIdentifiers.friendsListIframeId).contents().find(elementIdentifiers.friendsListIframeButton);
  var friends = [];

  friendObjs.each(function () {
    var headers = $(this).find(elementIdentifiers.friendsListUsernameType);
    if(!$(headers[0]).hasClass(elementIdentifiers.friendsListUsernameIgnoreClass)){
      var name = $(headers[0]).text();
      friends.push({
        username: name,
        name: name
      });

      userToButtonMap[name] = {
        button: $(this),
        uri: $(this)[0].baseURI
      };
    }
  });

  return friends;

};

var findFriendChatWindow = function (name) {
  var friendChatWindow = null;
  $(elementIdentifiers.chatWindowIframeClass).each(function () {
    var chatWindow = $(this).find('iframe');
    var recipient = chatWindow.contents().find(elementIdentifiers.chatWindowRecipient).text();
    if (recipient === name) {
      friendChatWindow = chatWindow;
    }
  });

  return friendChatWindow;
};

var findFriendMessages = function () {

}