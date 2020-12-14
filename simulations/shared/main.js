var babyparse = require('babyparse');
var fs = require('fs');

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
    return _.includes(target.split('_'), uttLex) ? 1 : 0.00001;
  }));
};

// We directly implement RSA without webppl to avoid overhead
// P(obj | utt) \propto L(obj, utt)
// => log(p) = log [ L(obj, utt) / \sum_{i} L(obj_i, utt) ]
// if given object isn't in extension, some small probability of guessing it anyway
var getL0Score = function(target, utt, params) {
  var targetMeaning = getLexiconElement(utt, target, params);
  var noiseProb = 1 / params.context.length;
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
  var noiseProb = 1 / params.utterances.length;
  var truth = params.speakerAlpha * getL0Score(targetObj, utt, params);
  var sum = params.speakerAlpha * getL0Score(targetObj, params.utterances[0], params);
  for(var i=1; i< params.utterances.length; i++){
    sum = numeric.logaddexp(sum, params.speakerAlpha * getL0Score(targetObj, params.utterances[i], params));
  }
  var choiceProb = Math.exp(normalize(truth, sum));
  return Math.log(noiseProb * params.guessingEpsilon +
                  choiceProb * (1-params.guessingEpsilon));
}

module.exports = {
  readCSV: readCSV,
  getL0Score,
  getS1Score
};
