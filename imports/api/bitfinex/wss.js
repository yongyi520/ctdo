import BitfinexAPIWebsocketClient from '/imports/api/bitfinex/lib/websocketClient.js';

import { insertErrorLogNoFiber, insertUpdateLogNoFiber, insertErrorLogFiber } from '/imports/api/system-logs/systemLogs-update.js';

var bitfinexKey = Meteor.settings.bitfinex.trading.key;
var bitfinexSecret = Meteor.settings.bitfinex.trading.secret;

var bitfinexWebsocketClient = new BitfinexAPIWebsocketClient({key: bitfinexKey, secret: bitfinexSecret});
var isAlive = true;
var wssOnOpenFunction = null;

export const getWebsocketClient = function(){
    return bitfinexWebsocketClient;
}

export const isSocketAlive = function(){
    return isAlive;
}

export const getWssOnOpenFunction = function(){
    return wssOnOpenFunction;
}

export const keepAlive = function(){
    console.log("bitfinex wss pong");
    isAlive = true;
}

export const ping = function(){
    isAlive = false;
    console.log("bitfinex wss ping");
    var errorHandlingFunction = function(socketError){
        if(socketError){
            insertErrorLogFiber("server", "bitfinex", "server", "bitfinex socket ping error: " + JSON.stringify(socketError));
            restartWebsocketClient();
        }
    }
    return bitfinexWebsocketClient.ping(errorHandlingFunction);
}


export const restartWebsocketClient = function(){
    bitfinexWebsocketClient.terminate();
    bitfinexWebsocketClient = new BitfinexAPIWebsocketClient({key: bitfinexKey, secret: bitfinexSecret});
    return openSocket(wssOnOpenFunction);
}

export const openSocket = function(onOpenFunction){
    wssOnOpenFunction = onOpenFunction;
    return bitfinexWebsocketClient.openSocket(onOpenFunction);
}

export const websocketAddMessageListener = function( listenerFunction ){
    return bitfinexWebsocketClient.addMessageListener( listenerFunction );
}

export const websocketSubscribeToChannel = function( params ) {
    return bitfinexWebsocketClient.subscribeToChannel(params);
}