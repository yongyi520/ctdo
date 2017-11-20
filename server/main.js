import { Meteor } from 'meteor/meteor';

import '/imports/startup/server'

import { openSocket, restartWebsocketClient, websocketAddMessageListener,
    ping, keepAlive, isSocketAlive,
    getWssOnOpenFunction } from '/imports/api/bitfinex/wss.js';

import { wssOrderListenerFunction } from '/imports/api/bitfinex/algorithm/algorithm-wss-listeners.js';
import { resyncBitfinexAlgorithms } from '/imports/api/bitfinex/algorithm/algorithm-resync.js';
// import { resyncMartingaleSHBLBitfinex, wssOrderListenerMartingaleSHBLFunction } from '/imports/api/bitfinex/algorithm/martingale/sell-high-buy-low/bitfinex-martingale-SHBL.js';


import {  insertErrorLogFiber } from '/imports/api/system-logs/systemLogs-update.js';


Meteor.startup(() => {
    // code to run on server at startup

    startBitfinexWssSocket()
    SyncedCron.start();
});

const startBitfinexWssSocket = function() {
    var messageListener = (data) => {
        // console.log( data );
        if(data.length >= 3 && data[1] != "hb"){
            console.log( "type", data[1]);
            console.log( "detail", data[2])
        }
    };

    var pingPongListener = (data) => {
        if(data.event == 'pong')
            keepAlive();
    }

    var onOpenFunction = () => {
        websocketAddMessageListener( messageListener );
        websocketAddMessageListener( pingPongListener );
        websocketAddMessageListener( wssOrderListenerFunction );
        setTimeout( () => resyncBitfinexAlgorithms(), 5000);
    };

    if(getWssOnOpenFunction() == null){
        openSocket( onOpenFunction );
        SyncedCron.add({
            name: 'bitfinex.wssPing',
            schedule: function(parser){
                return parser.text('every 5 minutes');
            },
            job: function(){
                ping();
                setTimeout(() => {
                    if(!isSocketAlive()){
                        console.log("bitfinex wss connection dead, restart websocket");
                        insertErrorLogFiber("server", "bitfinex", "server", "bitfinex connection dead, restarting server in 30 seconds");
                        restartWebsocketClient();
                    } else
                        console.log("bitfinex wss connection ping/pong successful")
                }, 5000)
            }
        })

    } else {
        console.log("socket already open")
        restartWebsocketClient();
    }
}