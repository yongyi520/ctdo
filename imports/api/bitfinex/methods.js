import { getWalletBalances, getMyActiveOrders, getOrderBook, getAllSymbols,
    getMyOrderStatus, getMyActivePositions,
    newOrder, replaceOrder, cancelOrder} from '/imports/api/bitfinex/rest.js';

import { getWebsocketClient, openSocket, restartWebsocketClient,
    websocketAddMessageListener, websocketSubscribeToChannel,
    ping, keepAlive, isSocketAlive,
    getWssOnOpenFunction } from '/imports/api/bitfinex/wss.js';

// import { resyncMartingaleSHBLBitfinex, initialSellFunction, wssOrderListenerMartingaleSHBLFunction, martingaleRunCreateNextOrders } from '/imports/api/bitfinex/algorithm/martingale/sell-high-buy-low/bitfinex-martingale-SHBL.js';
import { insertErrorLogNoFiber, insertUpdateLogNoFiber, insertErrorLogFiber } from '/imports/api/system-logs/systemLogs-update.js';
import { parseApiWallet, parseApiActivePositions } from '/imports/api/bitfinex/lib/parseResponse/api/apiResponseParser.js';

import { findOneOrderWithOrderIdNoFiber } from '/imports/api/orders/orders-search.js';


import { wssOrderListenerFunction } from '/imports/api/bitfinex/algorithm/algorithm-wss-listeners.js';
import { startMartingale } from '/imports/api/bitfinex/algorithm/algorithm-start.js';
import { resyncBitfinexAlgorithms } from '/imports/api/bitfinex/algorithm/algorithm-resync.js';
import { martingaleRunCreateNextOrders } from '/imports/api/bitfinex/algorithm/martingale/martingale-bitfinex.js';

import { findActiveAlgorithmRunWithOrderId, findActiveAlgorithmRunWithOrderIdNoFiber, findActiveAlgorithmRunNoFiber } from '/imports/api/algorithm-runs/algorithmRuns-search.js';

import { Algorithms } from '/imports/api/algorithms/algorithms.js';
import { AlgorithmRuns } from '/imports/api/algorithm-runs/algorithm-runs.js';

// algorithm
Meteor.methods({
    "bitfinex.martingaleSHBL": function(symbol){
        startMartingale(symbol, 'SHBL');
    },
    "bitfinex.martingaleBLSH": function(symbol){
        startMartingale(symbol, 'BLSH');
    },
    "bitfinex.wssListenerSetup": function(){

        var martingaleOrderListeners = (data) => {

        }
        websocketAddMessageListener( martingaleOrderListeners );
    }
})

// wss
Meteor.methods({
    "bitfinex.openSocket": function(){
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
            websocketAddMessageListener( wssOrderListenerFunction);
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
            SyncedCron.start();
        } else {
            console.log("socket already open")
            restartWebsocketClient();
        }



        // openSocket();
    },
    "bitfinex.ping": function(){
        ping();
    },
    "bitfinex.isSocketAlive": function(){
        console.log("is socket alive? ", isSocketAlive());
        return isSocketAlive();
    },
    "bitfinex.restartSocket": function(){
        restartWebsocketClient();
    }
})

// martingale fixes
Meteor.methods({
    "bitfinex.martingaleNextOrders": function(order_id){


        var order = findOneOrderWithOrderIdNoFiber(order_id);

        console.log("order_id", order_id);
        console.log("data type", typeof order_id);
        console.log("order in database", order);
        if(order){
            var algorithmRun = findActiveAlgorithmRunWithOrderIdNoFiber(order_id);
            var algorithm = Algorithms.findOne({_id: algorithmRun.algorithm_id});
            var errorHandlingFunction = (apiErrorMessage) => {

                if(apiErrorMessage.message.includes('Nonce is too small') || apiErrorMessage){
                    getMyOrderStatus({order_id: order.order_id}).then( (myOrderStatusApiResponse) => {
                        var parsedWssDetail = {
                            symbol: order.symbol,
                            average_price: myOrderStatusApiResponse.avg_execution_price,
                            order_id: order.order_id
                        }
                        console.log("parsed wss detail", parsedWssDetail)
                        martingaleRunCreateNextOrders(parsedWssDetail);
                    } )
                        .catch( errorHandlingFunction);
                }
            }
            getMyOrderStatus({order_id: order.order_id}).then( (myOrderStatusApiResponse) => {
                var parsedWssDetail = {
                    symbol: order.symbol,
                    average_price: myOrderStatusApiResponse.avg_execution_price,
                    order_id: order.order_id
                }

                console.log("parsed wss detail", parsedWssDetail)
                martingaleRunCreateNextOrders(parsedWssDetail, algorithm.type);
            } )
                .catch( errorHandlingFunction);

        } else {
            console.log("order not found");
        }

    }
})

// api
Meteor.methods({
    "bitfinex.getMyActivePositions": function(){
        getMyActivePositions().then( parseApiActivePositions ).catch( console.log );
    },
    "bitfinex.getOrderBook": function(){
        console.log("getting order book");
        // bid is buying, ask is selling
        // get bid [0] price and put 0.01 price higher than that
        var symbol = 'ethusd';
        var params = {limit_bids: 10, limit_asks: 10};
        getOrderBook(symbol, params).then( console.log )
            .catch( console.log )
    },
    "bitfinex.getAllSymbols": function(){
        console.log("getting all bitfinex symbols");
        getAllSymbols().then( console.log )
            .catch( console.log )
    },
    "bitfinex.getWalletBalances": function() {
        console.log("getting bitfinex wallet balance");
        getWalletBalances().then( (balances) => console.log(parseApiWallet(balances)) )
            .catch( console.log )
    },
    "bitfinex.getMyActiveOrders": function(){
        console.log("getting bitfinex active orders");
        getMyActiveOrders().then( console.log )
            .catch( console.log )
    },
    "bitfinex.getMyOrderStatus": function(){
        console.log("get my order status");
        var order_id = 4597234862;
        getMyOrderStatus({order_id}).then( console.log ).catch( console.log );
    },
    "bitfinex.newOrder": function(){
        console.log("creating new order");
        var params = {
            symbol: "etpusd",
            amount: "2",
            price: "3.2",
            side: "sell",
            type: "stop",
            exchange: "bitfinex"
        }
        newOrder(params).then( console.log )
            .catch( console.log )
    },
    "bitfinex.replaceOrder": function(){
        console.log("replace order");
        // remember that order_id changes after you replace it!
        var params = {
            order_id: 3678554358,
            symbol: "ethusd",
            amount: "0.35",
            price: "500.01",
            side: "sell",
            type: "exchange limit",
            exchange: "bitfinex"
        };
        replaceOrder(params).then( console.log )
            .catch( console.log )
    },
    "bitfinex.cancelOrder": function(){
        console.log("cancel order");
        var order_id = 3678624519;
        cancelOrder({order_id}).then( console.log )
            .catch( console.log )
    }
})