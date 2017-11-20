// api
import { getWalletBalances, getMyActiveOrders, getOrderBook, getAllSymbols,
    getMyOrderStatus, newOrder, replaceOrder, cancelOrder,
    getMyActivePositions } from '/imports/api/bitfinex/rest.js';

// wss
import { getWebsocketClient, openSocket, restartWebsocketClient,
    websocketAddMessageListener, websocketSubscribeToChannel } from '/imports/api/bitfinex/wss.js';

// parser
import { parseWssOrder, convertApiParsedOrderToWssParsedOrder } from '/imports/api/bitfinex/lib/parseResponse/wss/wssResponseParser';
import { parseApiOrder, parseApiWallet, parseApiActivePositions } from '/imports/api/bitfinex/lib/parseResponse/api/apiResponseParser.js';

// collections
import { Algorithms } from '/imports/api/algorithms/algorithms.js';
import { AlgorithmRuns } from '/imports/api/algorithm-runs/algorithm-runs.js';
import { AlgorithmSettings } from '/imports/api/algorithm-settings/algorithm-settings.js';
import { Orders } from '/imports/api/orders/orders.js';

// collection updater
import { updateCancelAlgorithmRun, updateCancelAlgorithmRuns, insertAlgorithmRun,
    addTotalAmountAndPriceToAlgorithmRunNoFiber, addExecutedAmountAndPriceToAlgorithmRunNoFiber,
    addOrderIdToAlgorithmRunNoFiber, updateCompleteAlgorithmRunNoFiber} from '/imports/api/algorithm-runs/algorithmRuns-update.js';
import { updateCancelOrder, updateExecutedOrder, updateExecutedOrderNoFiber, insertOrder } from '/imports/api/orders/orders-update.js';
import { insertErrorLogNoFiber, insertUpdateLogNoFiber, insertErrorLogFiber } from '/imports/api/system-logs/systemLogs-update.js';

// collection searcher
import { findActiveAlgorithmRunWithOrderId, findActiveAlgorithmRunWithOrderIdNoFiber, findActiveAlgorithmRunNoFiber } from '/imports/api/algorithm-runs/algorithmRuns-search.js';
import { activeOrdersWithOrderIdNoFiber, activeOrdersWithOrderId } from '/imports/api/orders/orders-search.js';


// libs
import Future from 'fibers/future';

var margingaleAlgoFindCriteria = {
    type: "SHBL",
    name: "martingale"
}

var previousWssData = null;

const setPreviousWssData = function(newWssData){
    previousWssData = newWssData;
}

const getPreviousWssData = function(){
    return previousWssData;
}

export const resyncMartingaleBitfinex = function(){
    console.log("resyncing to martingale Bitfinex algorithm run");

    // find active algorithm run
    var martingaleAlgorithms = Algorithms.find({name: "martingale"}).fetch();
    var algorithmIds = [];
    martingaleAlgorithms.forEach( algorithm => {
        algorithmIds.push(algorithm._id)
    })
    // find active algorithm run
    var activeAlgorithmRuns =  AlgorithmRuns.find({status: 'ACTIVE',
        exchange: 'bitfinex',
        algorithm_id: {$in: algorithmIds}}).fetch();
    // find the active orders within algorithm run
    if(activeAlgorithmRuns){
        activeAlgorithmRuns.forEach( algorithmRun => {
            console.log("algorithm run: ", algorithmRun);
            var algorithm = Algorithms.findOne(algorithmRun.algorithm_id);
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', algorithmRun.symbol, "Resyncing with margingale bitfinex " + algorithmRun.symbol)
            var activeOrders = activeOrdersWithOrderIdNoFiber(algorithmRun.order_ids);
            activeOrders.forEach( order => {
                // add a delay in there with each order so the server can finish api calls in orderly fashion

                var updateOrderStatusFunction = orderStatusApiResponse => {
                    var parsedOrderStatus = parseApiOrder(orderStatusApiResponse);
                    var parsedWssStatus = convertApiParsedOrderToWssParsedOrder(parsedOrderStatus);
                    console.log("parsed order status", parsedOrderStatus);
                    console.log("converted to wss", parsedWssStatus);
                    if (parsedOrderStatus.status == 'EXECUTED' || parsedOrderStatus.remaining_amount <= 0.0001){
                        // convert api order detail to parsedWssOrderDetail
                        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', algorithmRun.symbol,
                            orderStatusApiResponse.side + " order ( " + parsedOrderStatus.original_amount + " @ $" + parsedOrderStatus.average_executed_price + " ) Executed. Continue next step");
                        martingaleNextStep(parsedWssStatus, algorithm.type);
                    } else if (parsedWssStatus.status == 'CANCELED'){
                        // update canceled order
                        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', algorithmRun.symbol,
                            orderStatusApiResponse.side + " order ( " + parsedOrderStatus.original_amount + " @ $" + parsedOrderStatus.average_executed_price + " ) Canceled");
                        updateCancelOrder(parsedWssStatus.order_id);

                        // for testing!
                        // if(parsedWssStatus.original_amount > 0){ // change it to if(parsedWssStatus.amount > 0)
                        //     martingaleNextStep(parsedWssStatus);
                        // }
                        // if(parsedWssStatus.original_amount < 0) { // change it to if(parsedWssStatus.amount < 0) {
                        //     martingaleNextStep(parsedWssStatus);
                        // }
                    } else {
                        console.log("nothing has happened to order", parsedOrderStatus.symbol, " ", parsedOrderStatus.original_amount, "@ $", parsedOrderStatus.price);
                        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', algorithmRun.symbol,
                            "nothing has happened to " + parsedOrderStatus.symbol + " " + parsedOrderStatus.side + " order ( " + parsedOrderStatus.original_amount + "@ $" + parsedOrderStatus.price + " )");
                    }
                };

                var handleErrorFunction = apiErrorResponse => {
                    if(apiErrorResponse.message.includes('Nonce is too small') || _.isEmpty(apiErrorResponse)){
                        console.log("nouse too small, get order status, retry");
                        insertErrorLogFiber(algorithmRun.algorithm_id, 'bitfinex', algorithmRun.symbol, "resync get order status error: " + JSON.stringify(apiErrorResponse));
                        setTimeout(() => getMyOrderStatus({order_id: order.order_id}).then( updateOrderStatusFunction ).catch( handleErrorFunction ), 1000);
                    }
                }

                getMyOrderStatus({order_id: order.order_id}).then( updateOrderStatusFunction ).catch( handleErrorFunction )
            })
        })
    }
    // find the active orders and check on the status
    // if cancelled call
    // updateCancelOrder
    // if executed call
    // convert api order detail to parsedWssOrderDetail
    // martingaleNextStep(parsedWssOrderDetail);

}.future()

export const startNewMartingale = function(symbol, martingaleType){
    var params = {limit_bids: 5, limit_asks: 5};
    var martingaleFindCritera = {
        name: "martingale",
        type: martingaleType.toUpperCase()
    }
    var algorithm = Algorithms.findOne(martingaleFindCritera);
    var algorithmSetting = AlgorithmSettings.findOne({exchange: "bitfinex", algorithm_id: algorithm._id, symbol: symbol});

    // if the algorithm setting for martingale SHBL is on, then go ahead and start it or else don't start it
    if(algorithmSetting){
        if(algorithmSetting.is_active){
            insertUpdateLogNoFiber(algorithm._id, 'bitfinex', symbol, "Martingale Run SHBL started for bitfinex " + symbol)

            var errorHandlingFunction = (apiErrorMessage) => {
                insertErrorLogFiber(algorithm._id, "bitfinex", symbol, "initial sell function error: " + JSON.stringify(apiErrorMessage))
                if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
                    setTimeout( () => getOrderBook(symbol, params).then( (orderBook) => initialOrderFunction(orderBook, symbol, algorithm._id) )
                        .then( (orderApiResponse) => saveOrderAndInitNewAlgorithmRun(orderApiResponse, algorithm._id) )
                        .catch(errorHandlingFunction), 1000)
                }
            }

            getOrderBook(symbol, params).then( (orderBook) => initialOrderFunction(orderBook, symbol, algorithm._id) )
                .then( (orderApiResponse) => saveOrderAndInitNewAlgorithmRun(orderApiResponse, algorithm._id) )
                .catch( errorHandlingFunction);
        } else {
            console.log("bitfinex martingale SHBL ", symbol, " is not active, No sell function initiated")
        }

    } else {
        console.log("there's no algorithm setting for bitfinex omgusd martingale shbl");
    }


}

// functions for initial sell orders

const initialOrderFunction = function(orderBook, symbol, algorithmId){
    var martingaleFindCriteria = {
        _id: algorithmId
    }
    var algorithm = Algorithms.findOne(martingaleFindCriteria);
    var algorithmSetting = AlgorithmSettings.findOne({symbol: symbol, exchange: "bitfinex", algorithm_id: algorithmId});
    var initialPrice = null;
    var side = null;
    var amount = null;
    if(algorithm.type == "SHBL"){
        initialPrice = parseFloat(orderBook.bids[0].price) * 0.995;
        side = "sell";
        amount = algorithmSetting.start_amount - (Math.random() * algorithmSetting.start_amount * 0.04);
    } else if (algorithm.type == "BLSH"){
        initialPrice = parseFloat(orderBook.asks[0].price) * 1.005;
        side = "buy";
        amount = algorithmSetting.start_amount - (Math.random() * algorithmSetting.start_amount * 0.04);
    }

    var initialOrderParams = {
        symbol: symbol,
        amount: amount.toString(),
        price: initialPrice.toString(),
        side: side,
        type: "limit",
        exchange: "bitfinex"
    }
    // console.log("buy orders", buyOrders);
    // console.log("highest bid", highestBid);
    // console.log("lowest limit sell price", lowestLimitSellPrice);
    // console.log("symbol", symbol);
    console.log("params", initialOrderParams);

    insertUpdateLogNoFiber(algorithmId, 'bitfinex', symbol, "Creating initial " + side + " Order  " + algorithmSetting.start_amount.toString() + " @ $" + initialPrice.toString());
    return newOrder(initialOrderParams)
}

const saveOrderAndInitNewAlgorithmRun = function(orderAPIResponse, algorithmId){
    insertUpdateLogNoFiber(algorithmId, 'bitfinex', orderAPIResponse.symbol,
        "Initial Sell Order (" + orderAPIResponse.original_amount + " @ $" + orderAPIResponse.price + ") Created");
    saveOrder(orderAPIResponse);
    createNewAlgorithmRun(orderAPIResponse, algorithmId);
}

const saveOrderAndAddOrderIdToAlgorithmRun = function(orderApiResponse, algorithmRun){
    console.log("save order and add order id to algorithm run response", orderApiResponse);
    insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', orderApiResponse.symbol,
        orderApiResponse.side + " Order (" + orderApiResponse.original_amount + " @ $" + orderApiResponse.price + ") Created");
    saveOrder(orderApiResponse);
    var parsedApiOrder = parseApiOrder(orderApiResponse);
    addOrderToAlgorithmRun(parsedApiOrder, algorithmRun);
}

const saveOrder = function(orderAPIResponse) {
    console.log("order API Response", orderAPIResponse);

    var orderData = parseApiOrder(orderAPIResponse);

    console.log("inserting order data", orderData);
    insertOrder(orderData);
}

const createNewAlgorithmRun = function(orderAPIResponse, algorithmId){
    var algorithmRunOrders = [];
    var algorithm = Algorithms.findOne({_id: algorithmId});
    if(algorithm){
        algorithmRunOrders.push(orderAPIResponse.id);
        var algorithmRunData = {
            algorithm_id: algorithmId,
            symbol: orderAPIResponse.symbol,
            exchange: orderAPIResponse.exchange,
            order_ids: algorithmRunOrders,
            amount_total: 0,
            amount_executed: 0,
            amount_remaining: 0,
            average_total_price: 0,
            average_executed_price: 0,
            average_remaining_price: 0,
            status: 'ACTIVE'
        }
        console.log("inserting new algorithm run data", algorithmRunData);
        var existingAlgorithmRuns = AlgorithmRuns.find({status: algorithmRunData.status,
            exchange: algorithmRunData.exchange,
            symbol: algorithmRunData.symbol,
            algorithm_id: algorithmId}).fetch();
        console.log("existing run", existingAlgorithmRuns);
        if(existingAlgorithmRuns){
            updateCancelAlgorithmRuns(existingAlgorithmRuns);
        }
        insertAlgorithmRun(algorithmRunData);

    } else {
        console.log("there's no such algorithm exist", margingaleAlgoFindCriteria)
    }
}

const addOrderToAlgorithmRun = function(parsedApiOrder, algorithmRun){
    console.log("algorithmRun", algorithmRun);
    if(algorithmRun){
        addOrderIdToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.order_id);
    } else {
        console.log("cannot find active algorithm run with order id: ", parsedApiOrder.order_id)
    }
}

// functions for wss listener function

export const martingaleNextStep = function(parsedWssExecutedOrderDetail, martingaleType){

    // update orders, 5 second delay in case if order is filled immediately. Giving time for api response for orders to be saved in the database
    setTimeout( () => martingaleRunUpdateOrders(parsedWssExecutedOrderDetail), 10000);

    // check if remaining amount in algorithmRun is 0
    // if 0, then init new
    // if not, continue to next step
    setTimeout( () => margingaleRunCompleteAndInitNewOrNextStep(parsedWssExecutedOrderDetail, martingaleType), 20000);

}.future()

/**
 *  1. Find Active Orders within algorithm run
 *  2. update orders
 *      if order is the same as executed order
 *          update it to executed
 *          if executed order is a sell order
 *              add the sell amount to algorithm run
 *      if order is not the same as executed order
 *          update it to be canceled
 * @param parsedWssExecutedOrderDetail
 */

const martingaleRunUpdateOrders = function(parsedWssExecutedOrderDetail){

    // find the algorithmRun this order belongs to
    var algorithmRun = findActiveAlgorithmRunWithOrderIdNoFiber(parsedWssExecutedOrderDetail.order_id);
    var algorithm = Algorithms.findOne({_id: algorithmRun.algorithm_id});
    // get all orders that are active in this algorithm run
    var activeOrders = activeOrdersWithOrderIdNoFiber(algorithmRun.order_ids);
    console.log("algorithm run in updating orders", algorithmRun);
    console.log("active orders within algorithm run", activeOrders);
    _.forEach(activeOrders, (order) => {
        if(order.order_id == parsedWssExecutedOrderDetail.order_id){
            console.log("updating order id to be executed: ", order.order_id);
            console.log("parsed wss executed order detail", parsedWssExecutedOrderDetail);
            updateExecutedOrderNoFiber(order.order_id);

            insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedWssExecutedOrderDetail.symbol,
                order.side + " Order (" + parsedWssExecutedOrderDetail.original_amount + " @" + parsedWssExecutedOrderDetail.average_price + ") Executed");

            // if martingale SHBL, sell order = total amount, buy order = executed amount
            // if martingale BLSH, sell order = executed amount, buy order = total amount
            if(algorithm.type == "SHBL"){
                if(parsedWssExecutedOrderDetail.original_amount < 0){
                    addTotalAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedWssExecutedOrderDetail.original_amount, parsedWssExecutedOrderDetail.average_price);
                } else if (parsedWssExecutedOrderDetail.original_amount > 0){
                    addExecutedAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedWssExecutedOrderDetail.original_amount, parsedWssExecutedOrderDetail.average_price)
                }
            } else if (algorithm.type == "BLSH"){
                if(parsedWssExecutedOrderDetail.original_amount < 0){
                    addExecutedAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedWssExecutedOrderDetail.original_amount, parsedWssExecutedOrderDetail.average_price);
                } else if (parsedWssExecutedOrderDetail.original_amount > 0){
                    addTotalAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedWssExecutedOrderDetail.original_amount, parsedWssExecutedOrderDetail.average_price)
                }
            }

        } else {
            console.log("cancelling order id", order.order_id)
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedWssExecutedOrderDetail.symbol,
                "Check if order: (" + order.original_amount + " @ $ " + order.price + ") is partially filled then cancel");
            var errorHandlingFunction = (apiErrorMessage) => {
                insertErrorLogFiber(algorithmRun.algorithm_id, "bitfinex", algorithmRun.symbol, "Get order status error: " + JSON.stringify(apiErrorMessage))
                if(apiErrorMessage.message.includes('Nonce is too small') || apiErrorMessage){
                    setTimeout(() => getMyOrderStatus({order_id: order.order_id}).then( (myOrderStatusApiResponse) => updatePartialOrderThenCancelOrder(myOrderStatusApiResponse, algorithmRun) )
                        .catch( errorHandlingFunction ), 1000);
                }
            }
            getMyOrderStatus({order_id: order.order_id}).then( (myOrderStatusApiResponse) => updatePartialOrderThenCancelOrder(myOrderStatusApiResponse, algorithmRun) )
                .catch( errorHandlingFunction);
        }
    })

}.future()

const updatePartialOrderThenCancelOrder = function(activeApiOrderStatusResponse, algorithmRun){
    var parsedApiOrder = parseApiOrder(activeApiOrderStatusResponse);
    var algorithm = Algorithms.findOne({_id: algorithmRun.algorithm_id})
    console.log("checking if order is partially executed")
    console.log("unparsed partial order", activeApiOrderStatusResponse);
    console.log("parsed partial order", parsedApiOrder);
    if(parsedApiOrder.executed_amount != 0){
        console.log("partially fulfilled order");
        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
            parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") partially filled amount of ( " + parsedApiOrder.executed_amount + " @ $" + parsedApiOrder.average_executed_price + ")");

        // if algorithm type is SHBL (sell high buy low) sell order is total amount, buy order is executed amount
        // if algorithm type is BLSH (sell high buy low) sell order is executed amount, buy order is total amount
        if (algorithm.type == "SHBL"){
            if(parsedApiOrder.side == 'sell'){
                addTotalAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.executed_amount, parsedApiOrder.average_executed_price);
            } else if (parsedApiOrder.side == 'buy'){
                addExecutedAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.executed_amount, parsedApiOrder.average_executed_price);
            }
        } else if (algorithm.type == "BLSH"){
            if(parsedApiOrder.side == 'sell'){
                addExecutedAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.executed_amount, parsedApiOrder.average_executed_price);
            } else if (parsedApiOrder.side == 'buy'){
                addTotalAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.executed_amount, parsedApiOrder.average_executed_price);
            }
        }
    } else {
        console.log("no partial fulfilled order");
        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
            parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") not partially filled");

    }
    console.log("cancelling order");
    // updateCancelOrder(parsedApiOrder.order_id); // because order was not canceled and continued to execute the next one sometimes
    insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
        "Cancelling " + parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ")");

    var errorHandlingFunction = (apiErrorMessage) => {
        insertErrorLogFiber(algorithmRun.algorithm_id, "bitfinex", algorithmRun.symbol, "Cancel Order Error" + JSON.stringify(apiErrorMessage))
        console.log("canceling order error", apiErrorMessage);
        if (apiErrorMessage.message.includes('Order could not be cancelled')){
            updateCancelOrder(parsedApiOrder.order_id);
        } else if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage) || JSON.stringify(apiErrorMessage).includes("<!DOCTYPE html>")){
            setTimeout(() => cancelOrder({order_id: parsedApiOrder.order_id}).then( (response) => insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
                parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") Cancelled"))
                .catch( errorHandlingFunction ), 1000)

        }
    }

    cancelOrder({order_id: parsedApiOrder.order_id}).then( (response) => insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
        parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") Cancelled"))
        .catch( errorHandlingFunction );

}

const margingaleRunCompleteAndInitNewOrNextStep = function(parsedWssExecutedOrderDetail, martingaleType){
    var algorithmRun = findActiveAlgorithmRunWithOrderIdNoFiber(parsedWssExecutedOrderDetail.order_id);
    var algorithm = Algorithms.findOne({_id: algorithmRun.algorithm_id})
    if(algorithmRun){
        if(algorithmRun.amount_remaining == 0 || algorithmRun.amount_remaining <= 0.0001){
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, algorithmRun.exchange, algorithmRun.symbol, "remaining amount is 0 in algorithm run. Start restart algorithm run");
            updateCompleteAlgorithmRunNoFiber(algorithmRun._id);
            startNewMartingale(algorithmRun.symbol, algorithm.type);
        } else {
            // continue with martingale next step
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, algorithmRun.exchange, algorithmRun.symbol, "remaining amount is NOT 0 in algorithm run. Continue to next step in algorithm run");
            martingaleRunCreateNextOrders(parsedWssExecutedOrderDetail, martingaleType);
        }

    }
}.future()

/**
 * Create orders for next step of margingale process
 * 1. if executed order is a buy order
 *          - update algorithmRun as complete
 *          - (buy order automatically updated from (algorithmRunUpdateOrders)
 *      else if executed order is a sell order
 *          - create next sell order with (1 + step_size) * last sell price and 2x last sell amount
 *          - create next buy order with buy_back * average sold price of amount sold
 * @param executedOrderDetail
 */
export const martingaleRunCreateNextOrders = function(parsedWssExecutedOrderDetail, martingaleType){
    // create new orders
    // set a new sell order with double the amount

    // set a buy order to buy back the total amount sold

    console.log("martingale run creating next orders");
    var symbol = parsedWssExecutedOrderDetail.symbol;
    var algorithmRun = findActiveAlgorithmRunWithOrderIdNoFiber(parsedWssExecutedOrderDetail.order_id);
    var algorithmSetting = AlgorithmSettings.findOne({symbol: symbol, exchange: "bitfinex", algorithm_id: algorithmRun.algorithm_id});
    console.log("algorithm settings finding criteria", {symbol: symbol, exchange: "bitfinex", algorithm_id: algorithmRun.algorithm_id});
    console.log("algorithm run", algorithmRun);
    console.log("algorithmSetting", algorithmSetting);
    if(algorithmSetting){

        // generic martingale
        var next_step_amount = algorithmRun.amount_remaining * 2;
        var current_step_price = parsedWssExecutedOrderDetail.average_price != 0 ? parsedWssExecutedOrderDetail.average_price : parsedWssExecutedOrderDetail.original_price;
        var next_step_price_orig = current_step_price * (algorithmSetting.next_step_percentage);
        var next_step_price = (next_step_price_orig).toString();
        var next_order_params = {
            symbol: symbol,
            amount: next_step_amount.toString(),
            price: next_step_price,
            side: martingaleType == 'SHBL' ? "sell" : "buy",
            type: "limit",
            exchange: "bitfinex"
        }

        var total = algorithmRun.average_total_price * algorithmRun.amount_total;
        var executed = algorithmRun.average_executed_price * algorithmRun.amount_executed;

        var reset_price_orig = ( total * algorithmSetting.reset_percentage - executed) / algorithmRun.amount_remaining;
        var reset_price = (reset_price_orig).toString();
        var reset_amount = algorithmRun.amount_remaining;
        var reset_order_params = {
            symbol: symbol,
            amount: reset_amount.toString(),
            price: reset_price,
            side: martingaleType == 'SHBL' ? "buy" : "sell",
            type: "limit",
            exchange: "bitfinex"
        }

        var stop_price = (current_step_price * algorithmSetting.stop_loss_percentage);

        var stop_order_params = {
            symbol: symbol,
            amount: reset_amount.toString(),
            price: stop_price.toString(),
            side: martingaleType == 'SHBL' ? "buy" : "sell",
            type: "stop",
            exchange: "bitfinex"
        }

        console.log("next order params", next_order_params);
        console.log("reset order params", reset_order_params);
        console.log("stop order params", stop_order_params);

        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedWssExecutedOrderDetail.symbol,
            "Creating Martingale Next Step Orders. " + (parsedWssExecutedOrderDetail.original_amount < 0 ? "Sell" : "Buy") +
                " Order: " + next_order_params.amount + "@ $" + next_order_params.price + ". " + (parsedWssExecutedOrderDetail.original_amount < 0 ? "Buy" : "Sell") +
                " Order: " + reset_order_params.amount + "@ $" + reset_order_params.price);
        executeNextMargingaleOrders(next_order_params, reset_order_params, stop_order_params, algorithmRun, algorithmSetting);

    }

}.future()

const executeNextMargingaleOrders = function(nextOrderParams, resetOrderParams, stopOrderParams, algorithmRun, algorithmSetting){
    if (nextOrderParams.type == 'limit'){
        marginNextMartingaleOrder(nextOrderParams, resetOrderParams, stopOrderParams, algorithmRun, algorithmSetting);
    }

}

const marginNextMartingaleOrder = function(nextOrderParams, resetOrderParams, stopOrderParams, algorithmRun, algorithmSetting){
    var nextStepOrdersFunction = (walletApiResponse) =>{

        var parsedApiWallets = parseApiWallet(walletApiResponse);

        var nextOrderCurrency = nextOrderParams.symbol.slice(0, 3);
        var resetOrderCurrency = resetOrderParams.symbol.slice(3, 6);

        var sellCurrencyBalance = getMarginCurrencyBalanceFromWallets(parsedApiWallets, nextOrderCurrency);

        // // if wallet has enough eth balance
        if(hasEnoughNextOrderMarginBalance(sellCurrencyBalance, nextOrderParams, algorithmRun, algorithmSetting)){
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', nextOrderParams.symbol,
                "Has Enough Balance for " + nextOrderParams.side + " Order: " + nextOrderParams.amount + "@ $" + nextOrderParams.price);
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', nextOrderParams.symbol,
                "Creating " + nextOrderParams.side + " Order: " + nextOrderParams.amount + "@ $" + nextOrderParams.price);

            var nextOrderErrorHandlingFunction = (apiErrorMessage) => {
                insertErrorLogFiber(algorithmRun.algorithm_id, "bitfinex", nextOrderParams.symbol, "martingale next step " + nextOrderParams.side + " order error: " + JSON.stringify(apiErrorMessage))
                if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage) || JSON.stringify(apiErrorMessage).includes("<!DOCTYPE html>")){
                    setTimeout( () => newOrder(nextOrderParams).then( (orderAPIResponse) => saveOrderAndAddOrderIdToAlgorithmRun(orderAPIResponse, algorithmRun) )
                        .catch( nextOrderErrorHandlingFunction ), 1000)
                }
            }

            newOrder(nextOrderParams).then( (orderAPIResponse) => saveOrderAndAddOrderIdToAlgorithmRun(orderAPIResponse, algorithmRun) )
                .catch( nextOrderErrorHandlingFunction );
        } else {
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', nextOrderParams.symbol,
                "Not Enough Balance for " + nextOrderParams.side + " Order: " + nextOrderParams.amount + "@ $" + nextOrderParams.price);

            // insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', stopOrderParams.symbol,
            //     "Setting Stop " + stopOrderParams.side  + " Order: " + stopOrderParams.amount + "@ $" + stopOrderParams.price);
            // var stopOrderErrorHandlingFunction = (apiErrorMessage) => {
            //     insertErrorLogFiber(algorithmRun.algorithm_id, "bitfinex", nextOrderParams.symbol, "martingale next step stop order " + nextOrderParams.side + " order error: " + JSON.stringify(apiErrorMessage))
            //     if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
            //         setTimeout( () => newOrder(stopOrderParams).then( (orderAPIResponse) => saveOrderAndAddOrderIdToAlgorithmRun(orderAPIResponse, algorithmRun) )
            //             .catch( stopOrderErrorHandlingFunction ), 1000)
            //     }
            // }
            //
            // // 30 seconds wait for stop loss in case of random spikes after
            // setTimeout( () => newOrder(stopOrderParams).then( (orderAPIResponse) => saveOrderAndAddOrderIdToAlgorithmRun(orderAPIResponse, algorithmRun) )
            //     .catch( stopOrderErrorHandlingFunction ), 30000);
        }




        // buy order, assuming it has enough margin balance to buy back

        var resetOrderErrorHandlingFunction = (apiErrorMessage) => {
            insertErrorLogFiber(algorithmRun.algorithm_id, "bitfinex", resetOrderParams.symbol, "martingale next step " + resetOrderParams.side + " order error: " + JSON.stringify(apiErrorMessage))
            if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage) || JSON.stringify(apiErrorMessage).includes("<!DOCTYPE html>")){
                setTimeout(() => newOrder(resetOrderParams).then( (orderAPIResponse) => saveOrderAndAddOrderIdToAlgorithmRun(orderAPIResponse, algorithmRun))
                    .catch( resetOrderErrorHandlingFunction ), 1000)
            }
        }

        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', resetOrderParams.symbol,
            "Creating " + resetOrderParams.side + " Back Order: " + resetOrderParams.amount + "@ $" + resetOrderParams.price);

        setTimeout( () => newOrder(resetOrderParams).then( (orderAPIResponse) => saveOrderAndAddOrderIdToAlgorithmRun(orderAPIResponse, algorithmRun))
            .catch( resetOrderErrorHandlingFunction ), 5000 );

        console.log("parsed api wallet", parsedApiWallets);
        console.log("next order currency", nextOrderCurrency);
        console.log("reset order wallet", sellCurrencyBalance);
        console.log("has enough next order balance", hasEnoughNextOrderMarginBalance(sellCurrencyBalance, nextOrderParams, algorithmRun, algorithmSetting));
        console.log("reset order currency", resetOrderCurrency);
    }

    var getBalanceErrorHandlingFunction = (apiErrorMessage) => {
        insertErrorLogFiber(algorithmRun.algorithm_id, "bitfinex", nextOrderParams.symbol, "Martingale next step getBalance error: " + JSON.stringify(apiErrorMessage))

        if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage) || apiErrorMessage){
            setTimeout(() => getWalletBalances().then( nextStepOrdersFunction ).catch( getBalanceErrorHandlingFunction ), 1000);
        }
    }

    setTimeout(() => getWalletBalances().then( nextStepOrdersFunction ).catch( getBalanceErrorHandlingFunction ), 2000);
}

const getMarginCurrencyBalanceFromWallets = function(parsedApiWallets, currency){
    return _.find(parsedApiWallets, function(balance){
        return balance.type == 'trading' && balance.currency == currency;
    })
}

const hasEnoughNextOrderMarginBalance = function(sellCurrencyBalance, nextOrderParams, algorithmRun, algorithmSetting){
    var maxMarginAmount = algorithmSetting.max_margin_amount;
    var requiredSellAmount = parseFloat(nextOrderParams.amount) + algorithmRun.amount_remaining;
    console.log("checking sell margin balance");
    console.log("algorithm Run", algorithmRun);
    console.log("max margin amount", maxMarginAmount);
    console.log("required sell amount", requiredSellAmount);
    return maxMarginAmount >= requiredSellAmount;
}

const getExchangeCurrencyBalanceFromWallets = function(parsedApiWallets, currency){
    return _.find(parsedApiWallets, function(balance){
        return balance.type == 'exchange' && balance.currency == currency;
    })
}

const hasEnoughSellExchangeBalance = function(sellCurrencyBalance, sellOrderParams){
    var requiredSellAmount = parseFloat(sellOrderParams.amount);
    return sellCurrencyBalance.available >= requiredSellAmount;
}

const hasEnoughBuyExchangeBalance = function(buyCurrencyBalance, buyOrderParams){
    var requiredBuyAmount = parseFloat(buyOrderParams.amount) * parseFloat(buyOrderParams.price);
    return buyCurrencyBalance.available >= requiredBuyAmount;
}