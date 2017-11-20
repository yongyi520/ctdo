import { AlgorithmSettings } from '/imports/api/algorithm-settings/algorithm-settings.js';

Meteor.methods({
    "allAlgorithmSettings": function(){
        var allAlgoSettings = AlgorithmSettings.find().fetch();
        console.log("all algorithm settings", allAlgoSettings);
    },
    "resetAlgorithmSettings": function(){
        AlgorithmSettings.remove({})
    },
    "updateAlgorithmSettings": function(algorithmSettingId, algorithmSettingsData){
        var setting = AlgorithmSettings.findOne(algorithmSettingId);
        if(setting){
            AlgorithmSettings.update({_id: algorithmSettingId}, {
                $set: algorithmSettingsData
            })
        } else {
            console.log("cannot update algorithm settings because it cannot be found in the database")
        }
    },
    "turnOnAlgorithm": function(algorithmSettingId){
        var setting = AlgorithmSettings.findOne(algorithmSettingId);
        if(setting){
            console.log("turning on algorithm");
            AlgorithmSettings.update({_id: algorithmSettingId}, {
                $set: {is_active: true}
            })
        }
    },
    "turnOffAlgorithm": function(algorithmSettingId){
        var setting = AlgorithmSettings.findOne(algorithmSettingId);
        if(setting){
            console.log("turning off algorithm");
            AlgorithmSettings.update({_id: algorithmSettingId}, {
                $set: {is_active: false}
            })
        }
    }
})