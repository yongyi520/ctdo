import { AlgorithmSettings } from '/imports/api/algorithm-settings/algorithm-settings.js';

Meteor.publish("AlgorithmSettings", function(){
    return AlgorithmSettings.find()
})