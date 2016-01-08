Chats = new Mongo.Collection("chats");



if (Meteor.isClient) {

  // Task 3 Start
  var chatsSubs = Meteor.subscribe("chats");
  var users = Meteor.subscribe("users");
  // Task 3 End

  Meteor.subscribe("emojis");


Meteor.call("constructEmojiSet", function(error, result){
  if(error){
    console.log("error", error);
  }
  if(result){
    Session.set('all_emojis', result);
  }
});

var chat_input; //save input field element to make it accessible inside hepers

  // set up the main template the the router will use to build pages
  Router.configure({
    layoutTemplate: 'ApplicationLayout'
  });
  // specify the top level route, the page users see when they arrive at the site
  Router.route('/', function () {
    console.log("rendering root /");
    this.render("navbar", {to:"header"});
    this.render("lobby_page", {to:"main"});
  });

  // specify a route that allows the current user to chat to another users
  Router.route('/chat/:_id', function () {
    this.render("navbar", {to:"header"}); //render navbar first

    if(users.ready() && !Meteor.user()){
      this.render('must_login');
      var that = this;
      Meteor.setTimeout(function(){
        that.redirect('/');
      }, 2500);
      return;
    }

    // waits for chat subscription to make sure Chats collection is populated,
    // otherwise Chat.find() will return null and extra instances of chat will be created
    if(chatsSubs.ready()){
      // the user they want to chat to has id equal to
      // the id sent in after /chat/...
      var otherUserId = this.params._id;
      // find a chat that has two users that match current user id
      // and the requested user id
      var filter = {$or:[
                  {user1Id:Meteor.userId(), user2Id:otherUserId},
                  {user2Id:Meteor.userId(), user1Id:otherUserId}
                  ]};
      var chat = Chats.findOne(filter);
      // console.log("route found chat");
      // console.log(chat);
      var chatId;
      if (!chat){// no chat matching the filter - need to insert a new one
        Meteor.call("createChat", otherUserId, function(error, result){
          if(error){
            console.log("error", error);
          }
          if(result){
            chatId = result;
            Session.set("chatId",chatId);
          }
        });;
      }
      else {// there is a chat going already - use that.
        chatId = chat._id;
        Session.set("chatId",chatId);
      }

      this.render("chat_page", {to:"main"});
  } else {
    // render this while waiting on subscription
    this.render("spinner", {to:"main"});
  }


  });

  ///
  // helper functions
  ///
  Template.available_user_list.helpers({
    users:function(){
      return Meteor.users.find();
    }
  });
 Template.available_user.helpers({
    getUsername:function(userId){
      user = Meteor.users.findOne({_id:userId});
      return user.profile.username;
    },
    isMyUser:function(userId){
      if (userId == Meteor.userId()){
        return true;
      }
      else {
        return false;
      }
    }
  });

  Template.chat_page.onRendered(function(){
    //assign element after the template it's in was rendered
    chat_input = this.find('.js-send-chat :input[name="chat"]');
  });


  Template.chat_page.helpers({
    messages:function(){

      var chat = Chats.findOne({_id:Session.get("chatId")});

      return chat ? chat.messages : [];
    },
    other_user:function(){
      return ""
    }
  });


  Template.emoticons.helpers({
    emojiSet: function(){
      return Session.get('all_emojis');
    },
    emojisReady: function(){
      return Session.get('emojis_ready');
    }
  });

  Template.emoticons.events({
    //add emoji on click
    "click .emoticons_panel": function(event){
      //if not image, quit

      if(!HTMLImageElement.prototype.isPrototypeOf(event.target)) return;

      // selectionStart, selectionEnd is text selection in element
      // if selectionStart == selectionEnd then no selection and caret is positioned at  selectionStart
      var str = chat_input.value; //current input
      var emoji_alias = (chat_input.selectionStart === 0 ? ':' : ' :') + event.target.title + ':';  //get emoji string from clicked-on image
      var new_str = str.slice(0, chat_input.selectionStart) + emoji_alias + str.slice(chat_input.selectionEnd); //add emoji to input


      var new_pos = chat_input.selectionStart + emoji_alias.length; //calculate new careposition
      chat_input.value = new_str; //set input
      chat_input.selectionStart = chat_input.selectionEnd = new_pos;  //set caret to new position

      chat_input.focus(); //return focus to input field
    },
    "load .emoticons_panel .emoji:last-child": function(event){
      Session.set('emojis_ready', true);
      console.log("EMOTICONS LOADED");
    },
    // "shown.bs.collapse .emoticons_panel": function(event){
    //   event.target.scrollIntoView({behavior: 'smooth'});
    // }
  });


// Task 1 Start
Template.chat_message.helpers({
  getAvatar: function(){
    var user = Meteor.users.findOne({_id: this.commenterId});
    if(user){
      return user.profile.avatar;
    }else {
      return 'anon.png';
    }
  },
  getUsername: function(){
    var user = Meteor.users.findOne({_id: this.commenterId});
    if(user){
      return user.profile.username;
    }else {
      return 'anonymous';
    }
  },
  isMyUser:function(userId){
    return userId == Meteor.userId();
  }
});
// Task 1 End

 Template.chat_page.events({
  // this event fires when the user sends a message on the chat page
  'submit .js-send-chat':function(event){
    // stop the form from triggering a page reload
    event.preventDefault();

    //call method to update Chat collection
    Meteor.call("updateChat", Session.get("chatId"), event.target.chat.value
    , function(error, result){
      if(error){
        console.log("error", error);
      }
    });

    // reset the form
    event.target.chat.value = "";
  }
});
}


// start up script that creates some users for testing
// users have the username 'user1@test.com' .. 'user8@test.com'
// and the password test123

if (Meteor.isServer) {
  Meteor.startup(function () {
    if (!Meteor.users.findOne()){
      for (var i=1;i<9;i++){
        var email = "user"+i+"@test.com";
        var username = "user"+i;
        var avatar = "ava"+i+".png"
        console.log("creating a user with password 'test123' and username/ email: "+email);
        Meteor.users.insert({profile:{username:username, avatar:avatar}, emails:[{address:email}],services:{ password:{"bcrypt" : "$2a$10$I3erQ084OiyILTv8ybtQ4ON6wusgPbMZ6.P33zzSDei.BbDL.Q4EO"}}});
      }
    }

  });

  //supply new users with username and avatar by default
  Accounts.onCreateUser(function(options, user) {
    if(options.profile)
      user.profile = options.profile;
    if(!user.profile.username){
      var email = user.emails[0].address;
      user.profile.username = email.slice(0, email.indexOf('@'));
    }
    if(!user.profile.avatar)
      user.profile.avatar = 'anon.png';

    return user;
  });

  // Task 2 Start


  var emojiSet; //to keep emojis code on the server and share with clients on demand

  Meteor.methods({
    createChat: function (otherUserId) {
      return Chats.insert({user1Id: this.userId, user2Id:otherUserId});
    },
    updateChat: function(chatId, comment){
      // see if we can find a chat object in the database
      // to which we'll add the message
      var chat = Chats.findOne({_id: chatId});

      if (chat){// ok - we have a chat to use
        var msgs = chat.messages; // pull the messages property
        if (!msgs){// no messages yet, create a new array
          msgs = [];
        }
  // Task 1 Start
        var commenterId = this.userId ? this.userId : null;
        // is a good idea to insert data straight from the form
        // (i.e. the user) into the database?? certainly not.
        // push adds the message to the end of the array
        msgs.push({text: comment, commenterId: commenterId});

  // Task 1 End

        // put the messages array onto the chat object
        chat.messages = msgs;
        // update the chat object in the database.
        Chats.update(chat._id, chat);
      }
    },
    // Task 4 Start
    // construct emojis once on the server and save to emojiSet
    constructEmojiSet: function(){
      if(emojiSet) {
        return emojiSet; //if already available, return
      }

      var images = [];
      Emojis.useImages = true;
      for(var emoji of Emojis.find().fetch()){
        images.push(emoji.toHTML());
      }

      emojiSet = images.join(' '); //save so that we don't have to recalculate again
      return emojiSet;
    }
    // Task 4 End
  });
  // Task 2 End

// Task 3 Start
  Meteor.publish("chats", function(){
    // console.log("getting CHATS subs for " + this.userId);
    return Chats.find({$or: [{user1Id: this.userId}, {user2Id: this.userId}]});
  });

  Meteor.publish("users", function(){
    // console.log("getting USERS subs");
    return Meteor.users.find();
  });
// Task 3 End

  Meteor.publish("emojis", function(){
    // console.log("getting EMOJIS subs");
    return Emojis.find();
  });


}
