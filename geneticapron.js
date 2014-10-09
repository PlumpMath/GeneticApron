// Set up a collection to contain choice information. On the server,
// it is backed by a MongoDB collection named "choices".

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

  Template.catalog.selected_name = function () {
    var choice = Choices.findOne(Session.get("selected_choice"));
    return choice && choice.name;
  };

  Template.choice.selected = function () {
    return Session.equals("selected_choice", this._id) ? "selected" : '';
  };

  Template.catalog.events({
    'click button.select': function () {
//        Choices.update(Session.get("selected_choice"), {$inc: {score: 5}});
        var ret = Meteor.call('shuffleChoiceNames', function(e, r) {
            console.log(r);
        });
    }
  });

  Template.choice.events({
    'click': function () {
      console.log(this);
      Session.set("selected_choice", this._id);
    }
  });

  Template.controls.events({
    'click button.reset': function () {
       Meteor.call('reinitChoiceNames');
    }
  });
}

// On server startup, create some choices if the database is empty.
if (Meteor.isServer) {

var myjson = {};
 myjson = JSON.parse(Assets.getText("designs.json"));

  Meteor.methods({
      reinitChoiceNames: function() {
          Choices.remove({});
          for (var i = 0; i < myjson.designs.length; i++) {
            Choices.insert({name: myjson.designs[i].name});
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
            Choices.update(post, {$set: {name: p2 + p1}});
          });
      },
  });

  Meteor.startup(function () {
    if (Choices.find().count() === 0) {
      var names = ["Button 1",
                   "Button 2",
                   "Button 3"];
      for (var i = 0; i < names.length; i++)
        Choices.insert({name: names[i]});
    }
    if (Choices.find().count() === 0) {
    }
  });
}

function randomIntInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
