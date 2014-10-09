var _SELECTION_MAX = 3;
var _POPULATION_SIZE;
var _MUTATION_PROBABILITY = 0.1;
var _END_GENERATIONS = 10.0;
var _MUTATION_REDUCTION_RATE = _MUTATION_PROBABILITY / _END_GENERATIONS;

// Set up a collection to contain apron information. On the server,
// it is backed by a MongoDB collection named "aprons".
Aprons = new Mongo.Collection("aprons");

if (Meteor.isClient) {
  Template.catalog.aprons = function () {
    return Aprons.find({}, {sort: { name: 1}});
  };

  Template.catalog.selected_names = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_apron"));
    if(selecteds === undefined) return "";
    var allaprons = [];
    for (var key in selecteds) {
        allaprons.push(Aprons.findOne({_id:key}).name);
    }
    return allaprons.join(", ");
  };
  
  Template.apron.chromosome_color = function () {
      return "#" + binaryToHex(this.chromosome).result;
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
        Session.set("selected_apron", undefined);
        var ret = Meteor.call('evolveGeneration', selecteds_ids, function(e, r) {
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
      if(Object.keys(selecteds).length < _SELECTION_MAX) {
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
  _POPULATION_SIZE = myjson.designs.length; // fix this  

  Meteor.methods({
      initPopulation: function() {
          Aprons.remove({});
          for (var i = 0; i < myjson.designs.length; i++) {
            Aprons.insert({name: myjson.designs[i].name, generation: 1, chromosome: myjson.designs[i].chromosome});
          }
      },

      evolveGeneration: function(fittest_ids) {
          var apronlen = Aprons.find().count();

          var fittest = [];
            fittest_ids.forEach(function(thisfit) {
                fittest.push(Aprons.findOne({_id: thisfit}));
            });

          // CREATE NEW GENERATION  
          var newGeneration = [];
          for(var i = 0; i < _POPULATION_SIZE; i++) {

             var nextGen = Aprons.findOne({}).generation + 1;

             //SELECT TWO PARENTS (assume that we're choosing more than one)
             fittest = shuffle(fittest);
             var parentA = fittest[0];
             var parentB = fittest[1];
             
             //TWO-POINT CROSSOVER
             splicePoint = randomIntInterval(0, parentA.chromosome.length - 1);
             var childOne = parentA.chromosome.slice(0, splicePoint) + parentB.chromosome.slice(splicePoint);

             //MUTATION (BIT-FLIP)
             var mutatedChildOne = ""
             for(var j = 0; j < childOne.length; j++) {
                var thisRand = Math.random();
                if((_MUTATION_PROBABILITY - (_MUTATION_REDUCTION_RATE * nextGen)) > thisRand) {
                    mutatedChildOne += (childOne[j] == "0") ? "1" : "0";
                } else {
                    mutatedChildOne += (childOne[j] == "0") ? "0" : "1";
                }
             }

             newGeneration.push(mutatedChildOne);
          }




          Aprons.remove({});

          for (var i = 0; i < newGeneration.length; i++) {

             Aprons.insert({name: chromosomeToName(newGeneration[i]), generation: nextGen, chromosome: newGeneration[i]});
          }

      },
  });

  Meteor.startup(function () {
    if (Aprons.find().count() === 0) {
      Meteor.call('initPopulation');
    }
  });
}


function chromosomeToName(c) {
    return "#" + binaryToHex(c).result;
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

function randomIntInterval(min,max)
{
    return Math.floor(Math.random()*(max-min+1)+min);
}

// converts binary string to a hexadecimal string
// returns an object with key 'valid' to a boolean value, indicating
// if the string is a valid binary string.
// If 'valid' is true, the converted hex string can be obtained by
// the 'result' key of the returned object
function binaryToHex(s) {
    var i, k, part, accum, ret = '';
    for (i = s.length-1; i >= 3; i -= 4) {
        // extract out in substrings of 4 and convert to hex
        part = s.substr(i+1-4, 4);
        accum = 0;
        for (k = 0; k < 4; k += 1) {
            if (part[k] !== '0' && part[k] !== '1') {
                // invalid character
                return { valid: false };
            }
            // compute the length 4 substring
            accum = accum * 2 + parseInt(part[k], 10);
        }
        if (accum >= 10) {
            // 'A' to 'F'
            ret = String.fromCharCode(accum - 10 + 'A'.charCodeAt(0)) + ret;
        } else {
            // '0' to '9'
            ret = String(accum) + ret;
        }
    }
    // remaining characters, i = 0, 1, or 2
    if (i >= 0) {
        accum = 0;
        // convert from front
        for (k = 0; k <= i; k += 1) {
            if (s[k] !== '0' && s[k] !== '1') {
                return { valid: false };
            }
            accum = accum * 2 + parseInt(s[k], 10);
        }
        // 3 bits, value cannot exceed 2^3 - 1 = 7, just convert
        ret = String(accum) + ret;
    }
    return { valid: true, result: ret };
}

// converts hexadecimal string to a binary string
// returns an object with key 'valid' to a boolean value, indicating
// if the string is a valid hexadecimal string.
// If 'valid' is true, the converted binary string can be obtained by
// the 'result' key of the returned object
function hexToBinary(s) {
    var i, k, part, ret = '';
    // lookup table for easier conversion. '0' characters are padded for '1' to '7'
    var lookupTable = {
        '0': '0000', '1': '0001', '2': '0010', '3': '0011', '4': '0100',
        '5': '0101', '6': '0110', '7': '0111', '8': '1000', '9': '1001',
        'a': '1010', 'b': '1011', 'c': '1100', 'd': '1101',
        'e': '1110', 'f': '1111',
        'A': '1010', 'B': '1011', 'C': '1100', 'D': '1101',
        'E': '1110', 'F': '1111'
    };
    for (i = 0; i < s.length; i += 1) {
        if (lookupTable.hasOwnProperty(s[i])) {
            ret += lookupTable[s[i]];
        } else {
            return { valid: false };
        }
    }
    return { valid: true, result: ret };
}
