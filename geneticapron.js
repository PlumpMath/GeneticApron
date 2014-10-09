var _SELECTION_MAX = 5;
var _POPULATION_SIZE = 40;
var _MUTATION_PROBABILITY = 0.1;
var _END_GENERATIONS = 20.0;
var _MUTATION_REDUCTION_RATE = _MUTATION_PROBABILITY / _END_GENERATIONS;

// Set up a collection to contain apron information. On the server,
// it is backed by a MongoDB collection named "aprons".
Aprons = new Mongo.Collection("aprons");

if (Meteor.isClient) {
  Template.catalog.aprons = function () {
    return Aprons.find({}, {sort: { rand: 1}});
  };

  Template.breed_controls.selected_names = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_apron"));
    if(selecteds === undefined) return "";
    var allaprons = [];
    for (var key in selecteds) {
        allaprons.push(Aprons.findOne({_id:key}).name);
    }
    return allaprons.join(", ");
  };

  Template.generation_controls.generation = function() {
    return Aprons.findOne({}).generation;
  };
  
  Template.apron.chromosome_style = function () {
      var stripe = this.chromosome.slice(0,1);
      var color = "#" + binaryToHex(this.chromosome.slice(1, 25)).result;
      var color2 = "#" + binaryToHex(this.chromosome.slice(25, 49)).result;
console.log(this.chromosome.slice(49));
      var stripethickness = binaryToDec(this.chromosome.slice(49, 54));
      var striperotation = binaryToDec(this.chromosome.slice(54, 62)) / 256.0 * 180;

      if(stripe == "0")    
        return "background-color:" + color;
      var thisstyle=  'background: repeating-linear-gradient(' + striperotation + 'deg,' + color + ',' + color + ' ' + stripethickness + 'px,' + color2 + ' ' + stripethickness + 'px,' + color2 + ' ' + (stripethickness * 2) + 'px);';

      console.log(thisstyle);
      return thisstyle;
  };

  Template.apron.selected = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_apron"));
    if(selecteds === undefined)
        return "";
    return (this._id in selecteds) ? "selected" : '';
  };

  Template.apron.image = function() {
    return "<img src=/ebola_suit_transp.png>";
  };

  Template.breed_controls.events({
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

  Template.generation_controls.events({
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
          Aprons.remove({});
          for (var i = 0; i < myjson.designs.length; i++) {
            Aprons.insert({name: chromosomeToName(myjson.designs[i].chromosome), generation: 1, chromosome: myjson.designs[i].chromosome});
          }
          var chromosomeLength = Aprons.findOne({}).chromosome.length;
          for (var i = 0; i < _POPULATION_SIZE -  myjson.designs.length; i++) {
              thisChr = "";
              for( var j =0; j < chromosomeLength; j++) {
                  thisChr += randomIntInterval(0, 1);
              }
              Aprons.insert({name: chromosomeToName(thisChr), generation: 1, chromosome: thisChr});
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
    return "#" + binaryToHex(c.slice(1,25)).result;
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

function binaryToDec(binary) {
    return parseInt(binary, 2);
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

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

/**
 * Converts an RGB color value to HSL. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes r, g, and b are contained in the set [0, 255] and
 * returns h, s, and l in the set [0, 1].
 *
 * @param   Number  r       The red color value
 * @param   Number  g       The green color value
 * @param   Number  b       The blue color value
 * @return  Array           The HSL representation
 */
function rgbToHsl(r, g, b){
    r /= 255, g /= 255, b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if(max == min){
        h = s = 0; // achromatic
    }else{
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return [h, s, l];
}
