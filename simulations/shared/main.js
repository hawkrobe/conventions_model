var babyparse = require('babyparse');
var fs = require('fs')

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8'),
			 {header:true, skipEmptyLines:true}).data;
};

var normalize = function(truth, sum) {
  return ad.scalar.sub(truth, sum);
};

var getLexiconElement = function(utt, target, params) {
  return _.min(_.map(utt.split('_'), function(word) {
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

module.exports = {
  readCSV: readCSV,
  getL0Score,
  getL1Score,
  getS1Score,
  getUttCost,
  getLexiconElement
};
