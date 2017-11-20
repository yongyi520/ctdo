import { SystemLogs } from '/imports/api/system-logs/system-logs.js';


Meteor.methods({
    "clearAllSystemLogs": function(){
        SystemLogs.remove({});
    }
})