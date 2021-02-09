var babyparse = require('babyparse');
var fs = require('fs');

var normalize = function(truth, sum) {
  return ad.scalar.sub(truth, sum);
};

var getLexiconElement = function(utt, target, params) {
  return _.max(_.map(utt.split('_'), function(word) {
    var uttLex = params.lexicon[word];
    return _.includes(target.split('_'), uttLex) ? 1 : 0;
  }));
};

var getUttCost = function(utt) {
  return utt.split('_').length;
};

// We directly implement RSA without webppl to avoid overhead
// P(obj | utt) \propto L(obj, utt)
// => log(p) = log [ L(obj, utt) / \sum_{i} L(obj_i, utt) ]
// if given object isn't in extension, some small probability of guessing it anyway
var getL0Score = function(target, utt, params) {
  var noiseProb = 1 / params.context.length;
  var targetMeaning = getLexiconElement(utt, target, params);

  // Assume null object in context, so only possibility of picking object for which utterance
  // is false comes from guessing
//  console.log(target, utt, params.lexicon, targetMeaning)
  if(targetMeaning == 0) {
    return Math.log(noiseProb * params.guessingEpsilon);
  } 
  
  var otherMeanings = 0;
  for(var i=0; i<params.context.length; i++){
    otherMeanings += getLexiconElement(utt, params.context[i], params);
  }
  var choiceProb = targetMeaning / otherMeanings;
  return Math.log(noiseProb * params.guessingEpsilon +
                  choiceProb * (1-params.guessingEpsilon));
};

// P(utt | obj) \propto e^{alpha * log P(obj | utt)}
// => log P(utt | obj) = alpha * log P(obj | utt) - log(sum_i e^{alpha * log P(obj | utt)})
var getS1Score = function(utt, targetObj, params) {
  // if given utterance is bad, some small probability of saying it anyway
  var utility = function(utt) {
    var inf = params.speakerAlpha * getL0Score(targetObj, utt, params);
    return (1 - params.costWeight) * inf - params.costWeight * getUttCost(utt);
  };

  var noiseProb = 1 / params.utterances.length;
  var truth = utility(utt);
  var sum = utility(params.utterances[0]);
  for(var i=1; i< params.utterances.length; i++){
    sum = numeric.logaddexp(sum, utility(params.utterances[i]));
  }
  var choiceProb = Math.exp(normalize(truth, sum));
  return Math.log(noiseProb * params.guessingEpsilon +
                  choiceProb * (1-params.guessingEpsilon));
}

// P(utt | obj) \propto e^{alpha * log P(obj | utt)}
// => log P(utt | obj) = alpha * log P(obj | utt) - log(sum_i e^{alpha * log P(obj | utt)})
var getL1Score = function(obj, utt, params) {
  // if given utterance is bad, some small probability of saying it anyway
  var utility = function(obj) {
    return params.listenerAlpha * getS1Score(utt, obj, params);
  };

  // Assume null object in context, so only possibility of picking object for which utterance
  // is false comes from guessing
  var targetMeaning = getLexiconElement(utt, obj, params);
  var noiseProb = 1 / params.context.length;
  
  if(targetMeaning == 0) {
    return Math.log(noiseProb * params.guessingEpsilon);
  } 

  var truth = utility(obj);
  var sum = utility(params.context[0]);
  for(var i=1; i< params.context.length; i++){
    sum = numeric.logaddexp(sum, utility(params.context[i]));
  }
  var choiceProb = Math.exp(normalize(truth, sum));
  return Math.log(noiseProb * params.guessingEpsilon +
                  choiceProb * (1-params.guessingEpsilon));
}

var supportWriter = function(s, p, handle) {
 var sLst = _.toPairs(s);
 var l = sLst.length;
 for (var i = 0; i < l; i++) {
   fs.writeSync(handle, sLst[i].join(',')+','+p+'\n');
 }
};

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8'),
			 {header:true, skipEmptyLines:true}).data;
};

function writeCSV(jsonCSV, filename){
  fs.writeFileSync(filename, Papa.unparse(jsonCSV) + "\n");
};

// for more manual file writing control
// config may include 'a' or 'w' flag
var openFile = function(filename, defaultConfig) {
  var config = _.isObject(defaultConfig) ? defaultConfig : {'flag' : 'w'};
  var csvFile = fs.openSync(filename, config.flag);
  return csvFile;
};

var writeLine = function(line, handle){
  fs.writeSync(handle, line+'\n');
};

// filename may either be a string (in which case we automatically open new file) or a handle
// may pass an array of meta-data to be appended to each line
var writeMarginals = function(erp, filename, data) {
  var handle = _.isString(filename) ? openFile(filename) : filename;
  var supp = erp.support();
  supp.forEach(function(s) {
    var d = _.isEmpty(data) ? {s} : _.zipObject([data.join(',')], [s]);
    supportWriter(d, Math.exp(erp.score(s)), handle);
  });
  if(_.isString(filename))
    closeFile(handle);
};

var writeJoint = function(erp, filename) {
  var handle = openFile(filename);
  var supp = erp.support();

  // Write header
  if(_.isObject(supp[0])) {
    writeLine([_.keys(supp[0]),"prob"].join(','), handle);
  }

  // Write values
  supp.forEach(function(s) {
    writeLine([
      _.values(s), 
      Math.exp(erp.score(s))
    ].join(','), handle);
  })
  closeFile(handle);
};

var closeFile = function(handle){
 fs.closeSync(handle);
};

module.exports = {
  readCSV: readCSV,
  writeCSV: writeCSV,
  writeMarginals:writeMarginals,
  writeJoint: writeJoint,
  open: openFile,
  close: closeFile,
  writeLine: writeLine,
  getL0Score,
  getL1Score,
  getS1Score,
  getUttCost,
  getLexiconElement
};
