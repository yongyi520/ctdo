import { AlgorithmRuns } from '/imports/api/algorithm-runs/algorithm-runs.js';

Meteor.methods({
    "allAlgorithmRuns": function(){
        var allAlgoRuns = AlgorithmRuns.find().fetch();
        console.log("all algorithm runs", allAlgoRuns);
    },
    "removeNonActiveAlgorithmRuns": function(){
        AlgorithmRuns.remove({status: {$ne: 'ACTIVE'}})
    },
    "removeAlgorithmRuns": function(exchange, symbol){
        AlgorithmRuns.remove({exchange: exchange, symbol: symbol})
    },
    "resetAlgorithmRuns": function(){
        AlgorithmRuns.remove({})
    }
})