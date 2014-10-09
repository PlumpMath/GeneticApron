// Set up a collection to contain apron information. On the server,
// it is backed by a MongoDB collection named "aprons".
var _SELECTIONMAX = 2;
var _POPULATIONSIZE;

Aprons = new Mongo.Collection("aprons");
/* 
 * simple example: two buttons: -1 and +1 
 * when number is chosen, add value to running tally
 * then show -3, +5, etc
 */
if (Meteor.isClient) {
  Template.catalog.aprons = function () {
    return Aprons.find({}, {sort: { name: 1}});
  };

  Template.catalog.selected_names = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_apron"));
    var allaprons = [];
    for (var key in selecteds) {
        allaprons.push(Aprons.findOne({"_id":key}).name);
    }
    return allaprons.join(", ");
  };

  Template.apron.selected = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_apron"));
    if(selecteds === undefined)
        return "";
    return (this._id in selecteds) ? "selected" : '';
  };

  Template.catalog.events({
    'click button.select': function () {
        var selecteds_ids = Object.keys(EJSON.fromJSONValue(Session.get("selected_apron")));
        console.log(selecteds_ids);
        var ret = Meteor.call('evolveGeneration', selecteds_ids, function(e, r) {
            Session.set("selected_apron", undefined);
        });
    }
  });

  Template.apron.events({
    'click': function () {
      var selecteds = Session.get("selected_apron");
      if(selecteds === undefined) {
          selecteds = {};
          selecteds[this._id] = true;
          Session.set("selected_apron", EJSON.toJSONValue(selecteds));
          return;
      }
      if(this._id in selecteds) {
          delete selecteds[this._id];
          Session.set("selected_apron", EJSON.toJSONValue(selecteds));
          return;
      }
      if(Object.keys(selecteds).length < _SELECTIONMAX) {
          selecteds[this._id] = true;
          Session.set("selected_apron", EJSON.toJSONValue(selecteds));
          return;
      }
    }
  });

  Template.controls.events({
    'click button.reset': function () {
       Meteor.call('initPopulation');
       Session.set("selected_apron", undefined);
    }
  });
}

// On server startup, create some aprons if the database is empty.
if (Meteor.isServer) {

var myjson = {};
 myjson = JSON.parse(Assets.getText("designs.json"));

  Meteor.methods({
      initPopulation: function() {
          _POPULATIONSIZE = myjson.designs.length;
          Aprons.remove({});
          for (var i = 0; i < myjson.designs.length; i++) {
            Aprons.insert({name: myjson.designs[i].name, generation: 1});
          }
      },

      evolveGeneration: function(fittest_ids) {
          var apronlen = Aprons.find().count();

          var fittest = []
            fittest_ids.forEach(function(thisfit) {
                fittest.push(Aprons.findOne({_id: thisfit}));
            });
          console.log(fittest);

          Aprons.find({}, {sort: {name: 1}}).forEach(function(post) {
            var randApron = Aprons.findOne({}, {sort: {name: 1}, skip: randomIntInterval(0, apronlen-1)});
            var p1 = post.name.slice(0,post.name.length / 2);
            var p2 = randApron.name.slice(randApron.name.length / 2);
            Aprons.update(post, {$set: {name: p2 + p1}, $inc: {generation: 1}});
          });
      },
  });

  Meteor.startup(function () {
    if (Aprons.find().count() === 0) {
      Meteor.call('initPopulation');
    }
  });
}

function randomIntInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}
