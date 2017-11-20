import { Algorithms } from '/imports/api/algorithms/algorithms.js';

Meteor.methods({
    "allAlgorithms": function(){
        var allAlgo = Algorithms.find().fetch();
        console.log("all algorithms", allAlgo);
    },
    "resetAlgorithms": function(){
        console.log("resetting algorithm");
        Algorithms.remove({});
    },
    "addAlgorithm": function(){
        Algorithms.insert({
            type: "BLSH",
            name: "martingale"
        })
    }
})