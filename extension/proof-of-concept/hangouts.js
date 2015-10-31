var rescanDOMInteral = 1500;
var userToButtonMap = {};

$(document).ready(function(){
  
  var getFrameDepth = function(winToID) {
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

  setInterval(function(){
    getHangoutsFriends();
    findFriendChat("Jose Barrientos");
  }, rescanDOMInteral);

});

var getHangoutsFriends = function() {

  //friends list is stored in an iframe
  var friendObjs = $('#gtn-roster-iframe-id-b').contents().find('.Bb');
  var friends = [];

  friendObjs.each(function(){
    var headers = $(this).find('span');
    if(!$(headers[0]).hasClass('sV')){
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

var findFriendChat = function(name){
  // console.log(userToButtonMap[name].button);
  $('.talk_chat_widget').each(function(){
    var recipient = $(this).find('iframe').contents().find('.Ob2Lud').text();
    if (recipient) {
      console.log(recipient)
    }
  });
};