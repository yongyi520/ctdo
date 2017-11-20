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

export const resyncMartingaleSHBLBitfinex = function(){
    console.log("resyncing to martingale SHBL Bitfinex algorithm run");

    // find active algorithm run
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    var activeAlgorithmRuns =  AlgorithmRuns.find({status: 'ACTIVE',
        exchange: 'bitfinex',
        algorithm_id: algorithm._id}).fetch();
    // find the active orders within algorithm run
    if(activeAlgorithmRuns){
        activeAlgorithmRuns.forEach( algorithmRun => {
            console.log("algorithm run: ", algorithmRun);
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', algorithmRun.symbol, "Resyncing with margingale SHBL bitfinex " + algorithmRun.symbol)
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
                        martingaleNextStep(parsedWssStatus);
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

export const initialSellFunction = function(symbol){
    var params = {limit_bids: 5, limit_asks: 5};
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    var algorithmSetting = AlgorithmSettings.findOne({exchange: "bitfinex", algorithm_id: algorithm._id, symbol: symbol});

    // if the algorithm setting for martingale SHBL is on, then go ahead and start it or else don't start it
    if(algorithmSetting){
        if(algorithmSetting.is_active){
            insertUpdateLogNoFiber(algorithm._id, 'bitfinex', symbol, "Martingale Run SHBL started for bitfinex " + symbol)

            var errorHandlingFunction = (apiErrorMessage) => {
                insertErrorLogFiber(algorithm._id, "bitfinex", symbol, "initial sell function error: " + JSON.stringify(apiErrorMessage))
                if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
                    setTimeout( () => getOrderBook(symbol, params).then( (orderBook) => newSellOrderFunction(orderBook, symbol) )
                        .then( saveOrderAndInitNewAlgorithmRun )
                        .catch(errorHandlingFunction), 1000)
                }
            }

            getOrderBook(symbol, params).then( (orderBook) => newSellOrderFunction(orderBook, symbol) )
                .then( saveOrderAndInitNewAlgorithmRun )
                .catch( errorHandlingFunction);
        } else {
            console.log("bitfinex martingale SHBL ", symbol, " is not active, No sell function initiated")
        }

    } else {
        console.log("there's no algorithm setting for bitfinex omgusd martingale shbl");
    }


}


export const wssOrderListenerMartingaleSHBLFunction = function(data){
    if(data.length >= 3){
        if(data[1] == 'oc'){
            var parsedWssOrderDetail = parseWssOrder(data[2]);
            console.log("data detail", parsedWssOrderDetail);

            if (parsedWssOrderDetail.status.includes('EXECUTED') || Math.abs(parsedWssOrderDetail.amount) <= 0.0001){
                console.log("order executed");
                // console.log("previous wss data", getPreviousWssData());
                // make sure there's no duplicate data sent from the wss server
                // if(getPreviousWssData() == null || getPreviousWssData().original_amount != parsedWssOrderDetail.original_amount && getPreviousWssData().symbol != parsedWssOrderDetail.symbol){
                //     setPreviousWssData(parsedWssOrderDetail);
                martingaleNextStep(parsedWssOrderDetail);
                // } else {
                //     insertErrorLogNoFiber("server", "bitfinex", "server", "duplicate executed message on order { " + parsedWssOrderDetail.original_amount + "@ $" + parsedWssOrderDetail.original_price + " }");
                // }
            } else if(parsedWssOrderDetail.status.includes('CANCELED')){
                console.log("order cancelled");
                // update canceled order

                updateCancelOrder(parsedWssOrderDetail.order_id);

                // this is supposed to be in executed portion, but using this to test since I cannot test with real money yet
                // for testing
                // martingaleNextStep(parsedWssOrderDetail);

            }
        }
    }
}

// functions for initial sell orders

const newSellOrderFunction = function(orderBook, symbol){
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    var algorithmSetting = AlgorithmSettings.findOne({symbol: symbol, exchange: "bitfinex", algorithm_id: algorithm._id});
    console.log("algorithm setting", algorithmSetting);
    var buyOrders = orderBook.bids;
    var highestBid = buyOrders[0];
    var amount = algorithmSetting.start_amount - (Math.random() * algorithmSetting.start_amount * 0.04);
    // change the price later
    // var lowestLimitSellPrice = parseFloat(highestBid.price) + 10;
    var lowestLimitSellPrice = parseFloat(highestBid.price) * 0.995;
    var params = {
        symbol: symbol,
        amount: amount.toString(),
        price: lowestLimitSellPrice.toString(),
        side: "sell",
        type: "limit",
        exchange: "bitfinex"
    }
    console.log("buy orders", buyOrders);
    // console.log("highest bid", highestBid);
    // console.log("lowest limit sell price", lowestLimitSellPrice);
    // console.log("symbol", symbol);
    console.log("params", params);

    insertUpdateLogNoFiber(algorithm._id, 'bitfinex', symbol, "Creating initial Sell Order  " + amount.toString() + " @ $" + lowestLimitSellPrice.toString());
    return newOrder(params)
}

const saveOrderAndInitNewAlgorithmRun = function(orderAPIResponse){
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    insertUpdateLogNoFiber(algorithm._id, 'bitfinex', orderAPIResponse.symbol,
        "Initial Sell Order (" + orderAPIResponse.original_amount + " @ $" + orderAPIResponse.price + ") Created");
    saveOrder(orderAPIResponse);
    createNewAlgorithmRun(orderAPIResponse);
}

const saveOrderAndAddOrderIdToAlgorithmRun = function(orderApiResponse){
    console.log("save order and add order id to algorithm run response", orderApiResponse);
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    insertUpdateLogNoFiber(algorithm._id, 'bitfinex', orderApiResponse.symbol,
        orderApiResponse.side + " Order (" + orderApiResponse.original_amount + " @ $" + orderApiResponse.price + ") Created");
    saveOrder(orderApiResponse);
    var parsedApiOrder = parseApiOrder(orderApiResponse);
    addOrderToAlgorithmRun(parsedApiOrder);
}

const saveOrder = function(orderAPIResponse) {
    console.log("order API Response", orderAPIResponse);

    var orderData = parseApiOrder(orderAPIResponse);

    console.log("inserting order data", orderData);
    insertOrder(orderData);
}

const createNewAlgorithmRun = function(orderAPIResponse){
    var algorithmRunOrders = [];
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    if(algorithm){
        algorithmRunOrders.push(orderAPIResponse.id);
        var algorithmRunData = {
            algorithm_id: algorithm._id,
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
            algorithm_id: algorithmRunData.algorithm_id}).fetch();
        console.log("existing run", existingAlgorithmRuns);
        if(existingAlgorithmRuns){
            updateCancelAlgorithmRuns(existingAlgorithmRuns);
        }
        insertAlgorithmRun(algorithmRunData);

    } else {
        console.log("there's no such algorithm exist", margingaleAlgoFindCriteria)
    }
}

const addOrderToAlgorithmRun = function(parsedApiOrder){
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    var algorithmRun = findActiveAlgorithmRunNoFiber(algorithm._id, 'bitfinex', parsedApiOrder.symbol);
    console.log("algorithm", algorithm);
    console.log("algorithmRun", algorithmRun);
    if(algorithmRun){
        addOrderIdToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.order_id);
    } else {
        console.log("cannot find active algorithm run with order id: ", parsedApiOrder.order_id)
    }
}

// functions for wss listener function

const martingaleNextStep = function(parsedWssExecutedOrderDetail){

    // update orders, 5 second delay in case if order is filled immediately. Giving time for api response for orders to be saved in the database
    setTimeout( () => martingaleRunUpdateOrders(parsedWssExecutedOrderDetail), 10000);

    // next order or restart new run is 15 second delay to give 10 second leeway to update existing orders
    if(parsedWssExecutedOrderDetail.original_amount > 0){ // buy order
        console.log("resetting martingale run, start a new run");
        setTimeout( () => margingaleRunCompleteAndInitNew(parsedWssExecutedOrderDetail), 20000);
    } else if (parsedWssExecutedOrderDetail.original_amount < 0){ // sell order
        setTimeout(() => martingaleRunCreateNextOrders(parsedWssExecutedOrderDetail), 20000);
    }
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

            // if executed order is a sell order
            if(parsedWssExecutedOrderDetail.original_amount < 0){
                addTotalAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedWssExecutedOrderDetail.original_amount, parsedWssExecutedOrderDetail.average_price);
            } else if (parsedWssExecutedOrderDetail.original_amount > 0){
                addExecutedAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedWssExecutedOrderDetail.original_amount, parsedWssExecutedOrderDetail.average_price)
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
    console.log("checking if order is partially executed")
    console.log("unparsed partial order", activeApiOrderStatusResponse);
    console.log("parsed partial order", parsedApiOrder);
    if(parsedApiOrder.executed_amount != 0){
        console.log("partially fulfilled order");
        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
            parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") partially filled amount of ( " + parsedApiOrder.executed_amount + " @ $" + parsedApiOrder.average_executed_price + ")");
        if(parsedApiOrder.side == 'sell'){
            addTotalAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.executed_amount, parsedApiOrder.average_executed_price);
        } else if (parsedApiOrder.side == 'buy'){
            addExecutedAmountAndPriceToAlgorithmRunNoFiber(algorithmRun._id, parsedApiOrder.executed_amount, parsedApiOrder.average_executed_price);
        }
    } else {
        console.log("no partial fulfilled order");
        insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
            parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") not partially filled");

    }
    console.log("cancelling order");
    insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
        "Cancelling " + parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ")");

    var errorHandlingFunction = (apiErrorMessage) => {
        insertErrorLogFiber(algorithmRun.algorithm_id, "bitfinex", algorithmRun.symbol, "Cancel Order Error" + JSON.stringify(apiErrorMessage))
        if (apiErrorMessage.message.includes('Order could not be cancelled')){
            updateCancelOrder(parsedApiOrder.order_id);
        } else if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
            setTimeout(() => cancelOrder({order_id: parsedApiOrder.order_id}).then( (response) => insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
                parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") Cancelled"))
                .catch( errorHandlingFunction ), 1000)

        }
    }

    cancelOrder({order_id: parsedApiOrder.order_id}).then( (response) => insertUpdateLogNoFiber(algorithmRun.algorithm_id, 'bitfinex', parsedApiOrder.symbol,
        parsedApiOrder.side + " Order (" + parsedApiOrder.original_amount + " @" + parsedApiOrder.price + ") Cancelled"))
        .catch( errorHandlingFunction );

}

const margingaleRunCompleteAndInitNew = function(parsedWssExecutedOrderDetail){
    var algorithmRun = findActiveAlgorithmRunWithOrderIdNoFiber(parsedWssExecutedOrderDetail.order_id);
    if(algorithmRun){
        if(algorithmRun.amount_remaining == 0 || algorithmRun.amount_remaining <= 0.00001){
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, algorithmRun.exchange, algorithmRun.symbol, "remaining amount is 0 in algorithm run. Start restart algorithm run");
            updateCompleteAlgorithmRunNoFiber(algorithmRun._id);
            initialSellFunction(algorithmRun.symbol);
        } else {
            // continue with martingale next step
            insertUpdateLogNoFiber(algorithmRun.algorithm_id, algorithmRun.exchange, algorithmRun.symbol, "remaining amount is NOT 0 in algorithm run. Continue to next step in algorithm run");
            martingaleRunCreateNextOrders(parsedWssExecutedOrderDetail);
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
export const martingaleRunCreateNextOrders = function(parsedWssExecutedOrderDetail){
    // create new orders
    // set a new sell order with double the amount

    // set a buy order to buy back the total amount sold

    console.log("martingalerun creating next orders");
    var symbol = parsedWssExecutedOrderDetail.symbol;
    var algorithm = Algorithms.findOne(margingaleAlgoFindCriteria);
    var algorithmSetting = AlgorithmSettings.findOne({symbol: symbol, exchange: "bitfinex", algorithm_id: algorithm._id});
    var algorithmRun = findActiveAlgorithmRunWithOrderIdNoFiber(parsedWssExecutedOrderDetail.order_id);
    console.log("algorithm settings finding criteria", {symbol: symbol, exchange: "bitfinex", algorithm_id: algorithm._id});
    console.log("algorithm", algorithm);
    console.log("algorithm run", algorithmRun);
    console.log("algorithmSetting", algorithmSetting);
    if(algorithmSetting){
        // another method with amount, just double the total sold amount
        var next_sell_amount = algorithmRun.amount_remaining * 2;

        // var next_sell_amount = (algorithmRun.amount_remaining + algorithmSetting.start_amount);

        var soldPrice = parsedWssExecutedOrderDetail.average_price != 0 ? parsedWssExecutedOrderDetail.average_price : parsedWssExecutedOrderDetail.original_price;
        var next_sell_price_orig = soldPrice * (1 + algorithmSetting.step_size);
        // var next_sell_price = (next_sell_price_orig + 10).toFixed(2);
        var next_sell_price = (next_sell_price_orig).toString();
        var sell_order_params = {
            symbol: symbol,
            amount: next_sell_amount.toString(),
            price: next_sell_price,
            side: "sell",
            type: "limit",
            exchange: "bitfinex"
        }

        var total = algorithmRun.average_total_price * algorithmRun.amount_total;
        var executed = algorithmRun.average_executed_price * algorithmRun.amount_executed;
        var next_buy_price_orig = ( total * algorithmSetting.buy_back - executed) / algorithmRun.amount_remaining;
        // var next_buy_price = (next_buy_price_orig - 200).toFixed(2);
        var next_buy_price = (next_buy_price_orig).toString();
        var next_buy_amount = algorithmRun.amount_remaining;
        // var next_buy_amount = (total - executed) / next_buy_price_orig;
        var buy_order_params = {
            symbol: symbol,
            amount: next_buy_amount.toString(),
            price: next_buy_price,
            side: "buy",
            type: "limit",
            exchange: "bitfinex"
        }

        console.log("sell order params", sell_order_params);
        console.log("buy order params", buy_order_params);

        insertUpdateLogNoFiber(algorithm._id, 'bitfinex', parsedWssExecutedOrderDetail.symbol,
            "Creating Martingale Next Step Orders. Sell Order: " + sell_order_params.amount + "@ $" + sell_order_params.price + ". Buy Order: " + buy_order_params.amount + "@ $" + buy_order_params.price);
        executeNextMargingaleOrders(sell_order_params, buy_order_params, algorithm._id, algorithmRun, algorithmSetting);

    }

}.future()

const executeNextMargingaleOrders = function(sellOrderParams, buyOrderParams, algorithmId, algorithmRun, algorithmSetting){
    if(sellOrderParams.type == 'exchange limit'){
        exchangeNextMartingaleOrder(sellOrderParams, buyOrderParams, algorithmId, algorithmRun, algorithmSetting);
    } else if (sellOrderParams.type == 'limit'){
        marginNextMartingaleOrder(sellOrderParams, buyOrderParams, algorithmId, algorithmRun, algorithmSetting);
    }

}

const exchangeNextMartingaleOrder = function(sellOrderParams, buyOrderParams, algorithmId){
    var nextStepOrdersFunction = (walletApiResponse) =>{

        var parsedApiWallets = parseApiWallet(walletApiResponse);

        var sellOrderCurrency = sellOrderParams.symbol.slice(0, 3);
        var buyOrderCurrency = buyOrderParams.symbol.slice(3, 6);

        var sellCurrencyBalance = getExchangeCurrencyBalanceFromWallets(parsedApiWallets, sellOrderCurrency);

        var buyCurrencyBalance = getExchangeCurrencyBalanceFromWallets(parsedApiWallets, buyOrderCurrency);
        // // if wallet has enough eth balance
        if(hasEnoughSellExchangeBalance(sellCurrencyBalance, sellOrderParams)){
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', sellOrderParams.symbol,
                "Has Enough Balance for Sell Order: " + sellOrderParams.amount + "@ $" + sellOrderParams.price);
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', sellOrderParams.symbol,
                "Creating Sell Order: " + sellOrderParams.amount + "@ $" + sellOrderParams.price);

            var sellOrderErrorHandlingFunction = (apiErrorMessage) => {
                insertErrorLogFiber(algorithmId, "bitfinex", sellOrderParams.symbol, "martingale next step sell order error: " + JSON.stringify(apiErrorMessage))
                if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
                    setTimeout(() => newOrder(sellOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun )
                        .catch( sellOrderErrorHandlingFunction ), 1000)

                }
            }

            newOrder(sellOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun )
                .catch( sellOrderErrorHandlingFunction );
        } else {
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', sellOrderParams.symbol,
                "Not Enough Balance for Sell Order: " + sellOrderParams.amount + "@ $" + sellOrderParams.price);
        }




        var buyOrderErrorHandlingFunction = (apiErrorMessage) => {
            insertErrorLogFiber(algorithmId, "bitfinex", buyOrderParams.symbol, "martingale next step buy order error: " + JSON.stringify(apiErrorMessage))
            if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
                setTimeout(() => newOrder(buyOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun)
                    .catch( buyOrderErrorHandlingFunction ), 1000)
            }
        }

        // if wallet has enough usd balance
        if(hasEnoughBuyExchangeBalance(buyCurrencyBalance, buyOrderParams)){
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', buyOrderParams.symbol,
                "Has Enough Buy Balance for Buy Order: " + buyOrderParams.amount + "@ $" + buyOrderParams.price);
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', buyOrderParams.symbol,
                "Creating Buy Order: " + buyOrderParams.amount + "@ $" + buyOrderParams.price);

            setTimeout( () => newOrder(buyOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun)
                .catch( buyOrderErrorHandlingFunction ), 5000 );
        } else {
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', buyOrderParams.symbol,
                "Not Enough Buy Balance for Buy Order: " + buyOrderParams.amount + "@ $" + buyOrderParams.price);
            setTimeout( () => newOrder(buyOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun)
                .catch( buyOrderErrorHandlingFunction ), 5000 );
        }


        console.log("parsed api wallet", parsedApiWallets);
        console.log("sell order currency", sellOrderCurrency);
        console.log("sell order wallet", sellCurrencyBalance);
        console.log("has enough sell balance", hasEnoughSellBalance(sellCurrencyBalance, sellOrderParams));
        console.log("buy order currency", buyOrderCurrency);
        console.log("buy order wallet", buyCurrencyBalance);
        console.log("has enough buy balance", hasEnoughBuyBalance(buyCurrencyBalance, buyOrderParams));
    }

    var getBalanceErrorHandlingFunction = (apiErrorMessage) => {
        insertErrorLogFiber(algorithmId, "bitfinex", sellOrderParams.symbol, "Martingale next step getBalance error: " + JSON.stringify(apiErrorMessage))
        if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
            setTimeout(() => getWalletBalances().then( nextStepOrdersFunction ).catch( getBalanceErrorHandlingFunction ), 5000);
        }
    }

    setTimeout(() => getWalletBalances().then( nextStepOrdersFunction ).catch( getBalanceErrorHandlingFunction ), 2000);
}

const marginNextMartingaleOrder = function(sellOrderParams, buyOrderParams, algorithmId, algorithmRun, algorithmSetting){
    var nextStepOrdersFunction = (walletApiResponse) =>{

        var parsedApiWallets = parseApiWallet(walletApiResponse);

        var sellOrderCurrency = sellOrderParams.symbol.slice(0, 3);
        var buyOrderCurrency = buyOrderParams.symbol.slice(3, 6);

        var sellCurrencyBalance = getMarginCurrencyBalanceFromWallets(parsedApiWallets, sellOrderCurrency);

        // // if wallet has enough eth balance
        if(hasEnoughSellMarginBalance(sellCurrencyBalance, sellOrderParams, algorithmRun, algorithmSetting)){
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', sellOrderParams.symbol,
                "Has Enough Balance for Sell Order: " + sellOrderParams.amount + "@ $" + sellOrderParams.price);
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', sellOrderParams.symbol,
                "Creating Sell Order: " + sellOrderParams.amount + "@ $" + sellOrderParams.price);

            var sellOrderErrorHandlingFunction = (apiErrorMessage) => {
                insertErrorLogFiber(algorithmId, "bitfinex", sellOrderParams.symbol, "martingale next step sell order error: " + JSON.stringify(apiErrorMessage))
                if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
                    setTimeout( () => newOrder(sellOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun )
                        .catch( sellOrderErrorHandlingFunction ), 1000)
                }
            }

            newOrder(sellOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun )
                .catch( sellOrderErrorHandlingFunction );
        } else {
            insertUpdateLogNoFiber(algorithmId, 'bitfinex', sellOrderParams.symbol,
                "Not Enough Balance for Sell Order: " + sellOrderParams.amount + "@ $" + sellOrderParams.price);
        }




        // buy order, assuming it has enough margin balance to buy back

        var buyOrderErrorHandlingFunction = (apiErrorMessage) => {
            insertErrorLogFiber(algorithmId, "bitfinex", buyOrderParams.symbol, "martingale next step buy order error: " + JSON.stringify(apiErrorMessage))
            if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
                setTimeout(() => newOrder(buyOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun)
                    .catch( buyOrderErrorHandlingFunction ), 1000)
            }
        }

        insertUpdateLogNoFiber(algorithmId, 'bitfinex', buyOrderParams.symbol,
            "Creating Buy Back Order: " + buyOrderParams.amount + "@ $" + buyOrderParams.price);

        setTimeout( () => newOrder(buyOrderParams).then( saveOrderAndAddOrderIdToAlgorithmRun)
            .catch( buyOrderErrorHandlingFunction ), 5000 );

        console.log("parsed api wallet", parsedApiWallets);
        console.log("sell order currency", sellOrderCurrency);
        console.log("sell order wallet", sellCurrencyBalance);
        console.log("has enough sell balance", hasEnoughSellMarginBalance(sellCurrencyBalance, sellOrderParams, algorithmRun, algorithmSetting));
        console.log("buy order currency", buyOrderCurrency);
    }

    var getBalanceErrorHandlingFunction = (apiErrorMessage) => {
        insertErrorLogFiber(algorithmId, "bitfinex", sellOrderParams.symbol, "Martingale next step getBalance error: " + JSON.stringify(apiErrorMessage))

        if(apiErrorMessage.message.includes('Nonce is too small') || _.isEmpty(apiErrorMessage)){
            setTimeout(() => getWalletBalances().then( nextStepOrdersFunction ).catch( getBalanceErrorHandlingFunction ), 5000);
        }
    }

    setTimeout(() => getWalletBalances().then( nextStepOrdersFunction ).catch( getBalanceErrorHandlingFunction ), 2000);
}

const getMarginCurrencyBalanceFromWallets = function(parsedApiWallets, currency){
    return _.find(parsedApiWallets, function(balance){
        return balance.type == 'trading' && balance.currency == currency;
    })
}

const hasEnoughSellMarginBalance = function(sellCurrencyBalance, sellOrderParams, algorithmRun, algorithmSetting){
    var maxMarginAmount = algorithmSetting.max_margin_amount;
    var requiredSellAmount = parseFloat(sellOrderParams.amount) + algorithmRun.amount_remaining;
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