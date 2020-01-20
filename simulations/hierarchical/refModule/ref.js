var _ = require('lodash');
var fs = require('fs');
var babyparse = require('babyparse');

function k_combinations(set, k) {
  var i, j, combs, head, tailcombs;
  
  // There is no way to take e.g. sets of 5 elements from
  // a set of 4.
  if (k > set.length || k <= 0) {
    return [];
  }
  
  // K-sized set has only one K-sized subset.
  if (k == set.length) {
    return [set];
  }
  
  // There is N 1-sized subsets in a N-sized set.
  if (k == 1) {
    combs = [];
    for (i = 0; i < set.length; i++) {
      combs.push([set[i]]);
    }
    return combs;
  }
  
  combs = [];
  for (i = 0; i < set.length - k + 1; i++) {
    // head is a list that includes only our current element.
    head = set.slice(i, i + 1);
    // We take smaller combinations from the subsequent elements
    tailcombs = k_combinations(set.slice(i + 1), k - 1);
    // For each (k-1)-combination we join it with the current
    // and store it to the set of k-combinations.
    for (j = 0; j < tailcombs.length; j++) {
      combs.push(head.concat(tailcombs[j]));
    }
  }
  return combs;
}

var normalize = function(truth, sum) {
  return ad.scalar.sub(truth, ad.scalar.log(sum));
};

var getLexiconElement = function(utt, target, params) {
  var components = utt.split('_');
  if(components.length == 1) {
    var utt_i = _.indexOf(params.primitiveUtterances, utt);
    var target_i = _.indexOf(params.states, target);
    var lexiconElement = T.get(params.lexicon, utt_i * params.states.length + target_i);
    return ad.scalar.sigmoid(lexiconElement);
  } else {
    return ad.scalar.mul(getLexiconElement(components[0], target, params),
                         getLexiconElement(components[1], target, params));
  }
};

// We directly implement RSA without webppl to avoid overhead
// P(t | utt) \propto L(t, utt)
// => log(p) = log ( L(t, utt)) - log(\sum_{i} L(t_i, utt))
var getL0score = function(target, utt, params) {
  var scores = [];
  var sum = 0;
  var truth = getLexiconElement(utt, target, params);
  for(var i=0; i<params.context.length; i++){
    sum = ad.scalar.add(
      sum,
      ad.scalar.exp(getLexiconElement(utt, params.context[i], params))
    );
  }
  return normalize(truth, sum);
};

// return alpha * log P(u | o, c, l) - 
var getSpeakerScore = function(utt, targetObj, params) {
  var utility = function(possibleUtt) {
    return ad.scalar.sub(
      ad.scalar.mul(params.alpha, getL0score(targetObj, possibleUtt, params)),
      ad.scalar.mul(params.costWeight, possibleUtt.split('_').length)
    );
  };
  var scores = [];
  var sum = 0;
  var truth = utility(utt);
  // console.log('truth')
  // console.log(truth);
  for(var i=0; i< params.utterances.length; i++){
    var informativity = utility(params.utterances[i]);
    sum = ad.scalar.add(
      sum,
      ad.scalar.exp(informativity)
    );
  }
  return normalize(truth, sum);
};

// if P(o | u, c, l) = P(u | o, c, l) P(u | c, l) / sum_o P(u | o, c, l)
// then log(o | u, c, l) = log P(u | o, c, l) - log(sum_{o in context} P(u | o, c, l))
var getListenerScore = function(trueObj, utt, params) {
  var scores = [];
  var sum = 0;
  var truth = getSpeakerScore(utt, trueObj, params);
  for(var i=0; i< params.context.length; i++){
    var prob = getSpeakerScore(utt, params.context[i], params);
    sum = ad.scalar.add(
      sum,
      ad.scalar.exp(prob)
    );
  }
  return normalize(truth, sum);
};

var reformatData = function(rawData) {
  return _.map(rawData, function(row) {
    return _.omit(_.extend(row, {
      context: [row.object1name, row.object2name, row.object3name, row.object4name]
    }), 'object1name', 'object2name', 'object3name', 'object4name');
  });
}

function readCSV(filename){
  return babyparse.parse(fs.readFileSync(filename, 'utf8'),
			 {header:true, skipEmptyLines:true}).data;
};

// Note this is highly specific to our particular situation
var bayesianErpWriter = function(erp, filePrefix) {
  var supp = erp.support();

  if(_.has(supp[0], 'predictive')) {
    var predictiveFile = fs.openSync(filePrefix + "Predictives.csv", 'a');
  }

  supp.forEach(function(s) {
    if(_.has(s, 'predictive'))
      supportWriter(s.predictive, predictiveFile);
  });

  if(_.has(supp[0], 'predictive')) {
    fs.closeSync(predictiveFile);
  }

  console.log('writing complete.');
};

var supportWriter = function(s, handle) {
  var sLst = _.toPairs(s);
  var l = sLst.length;

  for (var i = 0; i < l; i++) {
    fs.writeSync(handle, sLst[i].join(',') + '\n');
  }
};

module.exports = {
  getL0score, getSpeakerScore, getListenerScore, getLexiconElement, k_combinations,
  reformatData, bayesianErpWriter, readCSV
};
