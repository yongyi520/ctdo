import { AlgorithmRuns } from '/imports/api/algorithm-runs/algorithm-runs.js';

Meteor.publish('AlgorithmRuns', function() {
    return AlgorithmRuns.find();
})