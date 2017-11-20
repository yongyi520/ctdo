import { SystemLogs } from '/imports/api/system-logs/system-logs.js';

Meteor.publish('SystemLogs', function(){
    return SystemLogs.find({}, {limit: 1000});
})