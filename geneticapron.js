var _SELECTION_MAX = 5;
var _POPULATION_SIZE = 40;
var _MUTATION_PROBABILITY = 0.1;
var _END_GENERATIONS = 20.0;
var _MUTATION_REDUCTION_RATE = _MUTATION_PROBABILITY / _END_GENERATIONS;

Aprons = new Mongo.Collection("aprons");
localAprons = new Mongo.Collection(null);


if (Meteor.isClient) {

  Meteor.startup(function () {
    if (localAprons.find().count() === 0) {
       localInitPopulation();
    }
  });

  Template.catalog.aprons = function () {
    return localAprons.find({}, {sort: { rand: 1}});
  };

  Template.breed_controls.selected_names = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_apron"));
    if(selecteds === undefined) return "";
    var allaprons = [];
    for (var key in selecteds) {
        allaprons.push(localAprons.findOne({_id:key}).name);
    }
    return allaprons.join(", ");
  };

  Template.generation_controls.generation = function() {
    if(localAprons.findOne({}) === undefined) return 1;
    return localAprons.findOne({}).generation;
  };
  
  Template.apron.chromosome_style = function () {
      return chromosomeToStyle(this.chromosome);
  };

  Template.apron.selected = function () {
    var selecteds = EJSON.fromJSONValue(Session.get("selected_apron"));
    if(selecteds === undefined)
        return "";
    return (this._id in selecteds) ? "selected" : '';
  };

  Template.breed_controls.events({
    'click button.select': function () {
        var selecteds_ids = Object.keys(EJSON.fromJSONValue(Session.get("selected_apron")));
        Session.set("selected_apron", undefined);
        evolveGeneration(selecteds_ids);
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
       localInitPopulation();
     }
  });
}

// On server startup, create some aprons if the database is empty.
if (Meteor.isServer) {


  Meteor.methods({

      getGenomeJSON: function() {
        var myjson = {};
        myjson = JSON.parse(Assets.getText("designs.json"));
        return myjson;
      },
      
  });

}

function localInitPopulation() {
    
   HTTP.get("designs.json", function(e,r) {
       r = JSON.parse(r.content);
       r.phenotypeSequence.name = "phenotypeSequence"; 
       r.chromosomeSequence.name = "chromosomeSequence"; 
       var chromosomeLength = 0;
       for (var i = 0; i < r.chromosomeSequence.length; i++) {
           chromosomeLength += r.chromosomeSequence[i].bits;
       }

       if("populationSize" in r) _POPULATION_SIZE = r.populationSize;
       if("mutationProbability" in r) _MUTATION_PROBABILITY = r.mutationProbability;
       if("endGenerations" in r) _END_GENERATIONS = r.endGenerations;
       if("selectionMax" in r) _SELECTION_MAX = r.selectionMax;
       _MUTATION_REDUCTION_RATE = _MUTATION_PROBABILITY / _END_GENERATIONS;

       localAprons.remove({});
    
       for (var i = 0; i < _POPULATION_SIZE ; i++) {
          thisChr = "";
          for( var j = 0; j < chromosomeLength; j++) {
              thisChr += randomIntInterval(0, 1);
          }
          localAprons.insert({name: chromosomeToName(thisChr), generation: 1, chromosome: thisChr});
       }

   });

   Session.set("selected_apron", undefined);
}

function evolveGeneration(fittest_ids) {
  var apronlen = localAprons.find().count();

  var fittest = [];
    fittest_ids.forEach(function(thisfit) {
        fittest.push(localAprons.findOne({_id: thisfit}));
    });

  // CREATE NEW GENERATION  
  var newGeneration = [];
  for(var i = 0; i < _POPULATION_SIZE; i++) {

     var nextGen = localAprons.findOne({}).generation + 1;

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

  localAprons.remove({});

  for (var i = 0; i < newGeneration.length; i++) {
     localAprons.insert({name: chromosomeToName(newGeneration[i]), generation: nextGen, chromosome: newGeneration[i]});
  }

}

function chromosomeToStyle(chromosome) {
      var chromosomeSequence = [
        { "name": "stripeBool", "bits": 1, "type": "bool" },
        { "name": "color1",     "bits": 24, "type": "rgb" },
        { "name": "color2",     "bits": 24, "type": "rgb" },
        { "name": "thickness",  "bits": 5, "type": "int", "min": 0, "max": 20},
        { "name": "angle",      "bits": 8, "type": "int", "min": 0, "max": 180, "postfix" : "deg"}];

      var phenotypeSequence = [
          { "type": "condition", 
              "condition": {
               "bool" : "stripeBool",
               "true"  : 
                  [ { "type": "expr",
                      "expr": [
                          "background: repeating-linear-gradient(",
                          "$angle", ",",
                          "$color1", ",",
                          "$color1", " ",
                          "$thickness", "px,",
                          "$color2", " ", "$thickness", "px,",
                          "$color2", " ", "*2$thickness", "px);",
                          ]
                  } ],
               "false"   : 
                  [ { "type": "expr",
                      "expr": ["background-color:", "$color1"]
                  } ],
              }
          }
      ];

               
      var genes = chromosomeToGenes(chromosome, chromosomeSequence);
      var phenotype = genesToPhenotype(genes, phenotypeSequence);
      console.log("final sequence = " + phenotype);

      return phenotype;

      if(genes.stripeBool == false) {    
        return "background-color:" + genes.color1;
      } 
      else {
          var phenotype = 'background: repeating-linear-gradient(' 
                  + genes.angle + ',' 
                  + genes.color1 + ',' 
                  + genes.color1 + ' ' 
                  + genes.thickness + 'px,' 
                  + genes.color2 + ' ' + genes.thickness + 'px,' 
                  + genes.color2 + ' ' + (genes.thickness * 2) + 'px);';
          return phenotype;
      }

}

function chromosomeToName(c) {
    return "#" + binaryToHex(c.slice(1,25)).result;
}

/***** HELPER FUNCTIONS *****/

function genesToPhenotype(genes, phenotypeSequence) {

    /* recursive function to convert phenotype sequence into a properly formatted phenotype, allowing for conditionals, etc. */

  var thisPheno = "";

  for(var i = 0; i < phenotypeSequence.length; i++) {
    var thisSeq = phenotypeSequence[i];
    switch(thisSeq.type) {
        case "condition":
            if(genes[thisSeq.condition.bool] == true) {
                thisPheno += genesToPhenotype(genes, thisSeq.condition.true);
            } else {
                thisPheno += genesToPhenotype(genes, thisSeq.condition.false);
            }
            break;
        case "expr":
            thisPheno += processExpression(genes, thisSeq.expr);
            break;
    }
  }
  return thisPheno;
}


function processExpression(genes, expr) {
    var processed = "";
    for(var i = 0; i < expr.length; i++) {
        var thisExpr = expr[i];
        var varSplit = thisExpr.split("$");
        if(varSplit.length > 1)  {
            //handle variable insertion
            var multiSplit = varSplit[0].split("*");
            var multiplier = 1;
            if(multiSplit.length > 1) {
                //handle multpliers
                multiplier = parseInt(multiSplit[1]);
                processed += parseInt(genes[varSplit[1]]) * multiplier;
            } else {
                processed += genes[varSplit[1]];
            }
        } else {
            processed += thisExpr;
        }
    }
    processed += "; ";
    return processed;
}


function chromosomeToGenes(chromosome, geneSequence) {

      var genes = {};

      var startBit = 0;
      for (var i = 0; i < geneSequence.length; i++) {
          var thisSeq = geneSequence[i];
          var endBit = startBit + thisSeq.bits;
          var thisGene = chromosome.slice(startBit, endBit);
          var thisPhenotype;

          switch(thisSeq.type) {
              case "bool":
                  thisPhenotype = Boolean(parseInt(thisGene));
                  break;
              case "rgb":
                  thisPhenotype = "#" + binaryToHex(thisGene).result;
                  break;
              case "int":
                  var thisval = binaryToDec(thisGene);
                  thisval = thisSeq.min + (thisval * 1.0 / Math.pow(2, thisSeq.bits) * (thisSeq.max - thisSeq.min))
                  thisPhenotype = Math.round(thisval);
                  if("postfix" in thisSeq) { thisPhenotype += thisSeq.postfix; }
                  break;
              case "float":
                  var thisval = binaryToDec(thisGene);
                  thisval = thisSeq.min + (thisval * 1.0 / Math.pow(2, thisSeq.bits) * (thisSeq.max - thisSeq.min))
                  thisPhenotype = thisval;
                  if("postfix" in thisSeq) { thisPhenotype += thisSeq.postfix; }
                  break;
          }

          genes[thisSeq.name] = thisPhenotype;

          startBit = endBit;
      }

      return genes; 
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

function randomIntInterval(min,max) {
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
