
import { compose } from 'react-komposer';
import { Bitfinex } from '/imports/ui/components/exchange/bitfinex/Bitfinex.jsx';

import { SystemLogs } from '/imports/api/system-logs/system-logs.js';
import { Orders } from '/imports/api/orders/orders.js';
import { AlgorithmSettings } from '/imports/api/algorithm-settings/algorithm-settings.js';
import { AlgorithmRuns } from '/imports/api/algorithm-runs/algorithm-runs.js';
import { Algorithms } from '/imports/api/algorithms/algorithms.js';

function getTrackerLoader(reactiveMapper){
    return (props, onData, env) => {
        let trackerCleanup = null;
        const handler = Tracker.nonreactive(() => {
            return Tracker.autorun(() => {
                // assign cleanup function
                trackerCleanup = reactiveMapper(props, onData, env);
            })
        })
    }
}

// usage
function reactiveMapper(props, onData){
    if(Meteor.subscribe('SystemLogs').ready() && Meteor.subscribe('Orders').ready()
        && Meteor.subscribe('AlgorithmSettings').ready() && Meteor.subscribe('AlgorithmRuns').ready()
        && Meteor.subscribe('Algorithms').ready()){
        const logs = SystemLogs;
        const algorithmSettings = AlgorithmSettings;
        const algorithmRuns = AlgorithmRuns;
        const orders = Orders;
        const algorithms = Algorithms;
        onData(null, {logs, algorithmSettings, algorithmRuns, orders, algorithms});
    }
}

export default ExchangeAPIContainer = compose(getTrackerLoader(reactiveMapper))(Bitfinex);