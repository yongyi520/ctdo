import { Algorithms } from '/imports/api/algorithms/algorithms.js';

Meteor.publish('Algorithms', function() {
    return Algorithms.find();
})