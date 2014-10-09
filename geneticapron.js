// Set up a collection to contain choice information. On the server,
// it is backed by a MongoDB collection named "choices".
var _SELECTIONMAX = 2;

Choices = new Mongo.Collection("choices");
/* 
 * simple example: two buttons: -1 and +1 
 * when number is chosen, add value to running tally
 * then show -3, +5, etc
 */
if (Meteor.isClient) {
  Template.catalog.choices = function () {
    return Choices.find({}, {sort: { name: 1}});
  };

  Template.catalog.selected_names = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_choice"));
    var allchoices = [];
    for (var key in selecteds) {
        allchoices.push(Choices.findOne({"_id":key}).name);
    }
    return allchoices.join(", ");
  };

  Template.choice.selected = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_choice"));
    if(selecteds === undefined)
        return "";
    return (this._id in selecteds) ? "selected" : '';
  };

  Template.catalog.events({
    'click button.select': function () {
        Session.set("selected_choice", undefined);
//        Choices.update(Session.get("selected_choice"), {$inc: {score: 5}});
        var ret = Meteor.call('shuffleChoiceNames', function(e, r) {
//            console.log(r);
        });
    }
  });

  Template.choice.events({
    'click': function () {
      var selecteds = Session.get("selected_choice");
      if(selecteds === undefined) {
          selecteds = {};
          selecteds[this._id] = true;
          Session.set("selected_choice", EJSON.toJSONValue(selecteds));
          return;
      }
      if(this._id in selecteds) {
          delete selecteds[this._id];
          Session.set("selected_choice", EJSON.toJSONValue(selecteds));
          return;
      }
      if(Object.keys(selecteds).length < _SELECTIONMAX) {
          selecteds[this._id] = true;
          Session.set("selected_choice", EJSON.toJSONValue(selecteds));
          return;
      }
    }
  });

  Template.controls.events({
    'click button.reset': function () {
       Meteor.call('initChoiceNames');
       Session.set("selected_choice", undefined);
    }
  });
}

// On server startup, create some choices if the database is empty.
if (Meteor.isServer) {

var myjson = {};
 myjson = JSON.parse(Assets.getText("designs.json"));

  Meteor.methods({
      initChoiceNames: function() {
          Choices.remove({});
          for (var i = 0; i < myjson.designs.length; i++) {
            Choices.insert({name: myjson.designs[i].name, generation: 1});
          }
      },
      shuffleChoiceNames: function() {
          var choicelen = Choices.find().count();
          Choices.find({}, {sort: {name: 1}}).forEach(function(post) {
            var randChoice = Choices.findOne({}, {sort: {name: 1}, skip: randomIntInterval(0, choicelen-1)});
            var p1 = post.name.slice(0,post.name.length / 2);
            var p2 = randChoice.name.slice(randChoice.name.length / 2);
            console.log("---");
            console.log(post.name);
            console.log(p2 + p1);
            Choices.update(post, {$set: {name: p2 + p1}, $inc: {generation: 1}});
          });
      },
  });

  Meteor.startup(function () {
    if (Choices.find().count() === 0) {
      Meteor.call('initChoiceNames');
    }
  });
}

function randomIntInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
