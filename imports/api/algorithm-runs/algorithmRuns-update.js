import { AlgorithmRuns } from '/imports/api/algorithm-runs/algorithm-runs.js';

// libs
import Future from 'fibers/future';

// collection updater
import { insertErrorLogNoFiber, insertUpdateLogNoFiber } from '/imports/api/system-logs/systemLogs-update.js';

export const updateCancelAlgorithmRuns = function(algorithmRuns){
    algorithmRuns.forEach( (algorithmRun) => {
        updateCancelAlgorithmRun(algorithmRun._id);
    })
}.future()

export const updateCancelAlgorithmRun = function(algorithmRunId){
    var match = AlgorithmRuns.findOne(algorithmRunId);
    if(match){
        console.log("cancelling algorithm run id: ", algorithmRunId);
        AlgorithmRuns.update(algorithmRunId, {
            $set: {status: 'CANCELED'}
        })
    } else {
        console.log("there's no match for the algorithm run id in the database to cancel")
    }
}.future()

export const insertAlgorithmRun = function( data ){
    AlgorithmRuns.insert(data)
}.future()

export const updateCompleteAlgorithmRunNoFiber = function(algorithmRunId){
    var match = AlgorithmRuns.findOne(algorithmRunId);
    if(match){
        console.log("marking complete on algorithm run id: ", algorithmRunId);
        AlgorithmRuns.update(algorithmRunId, {
            $set: { status: 'COMPLETE'}
        })
    } else {
        console.log("there's no match for the algorithm run id in the database to set complete")
    }
}

export const addTotalAmountAndPriceToAlgorithmRunNoFiber = function( algorithmRunId, amount, price){
    var match = AlgorithmRuns.findOne(algorithmRunId);
    if(match){
        console.log("adding total amount and price to algorithm run id: ", algorithmRunId);

        var amountAbs = Math.abs(amount);

        // update amount_total and average_total_price
        var totalAmount = match.amount_total + amountAbs;
        var totalPrice = (match.average_total_price * match.amount_total + amountAbs * price);
        var averageTotalPrice = totalPrice / totalAmount;

        // update amount_remaining and average_remaining_price
        var remainingAmount = match.amount_remaining + amountAbs;
        var remainingPrice = (match.average_remaining_price * match.amount_remaining + amountAbs * price)
        var averageRemainingPrice = remainingPrice / remainingAmount;
        // console.log("averageremainingprice is finite", averageRemainingPrice.isFinite());
        // averageRemainingPrice = averageRemainingPrice.isFinite() ? averageRemainingPrice : 0;

        console.log("totalAmount: ", totalAmount, " total price: ", totalPrice, " average total price: ", averageTotalPrice);
        console.log("remainingAmount: ", remainingAmount, " remaining price: ", remainingPrice, " average remaining price: ", averageRemainingPrice);

        insertUpdateLogNoFiber(match.algorithm_id, match.exchange, match.symbol, "Updating Total Amount on Algorithm Run. " +
            "totalAmount: "+ totalAmount + " total price: "+ totalPrice + " average total price: " + averageTotalPrice +
            '\n' + " remainingAmount: "+ remainingAmount + " remaining price: " + remainingPrice + " average remaining price: "+ averageRemainingPrice);

        AlgorithmRuns.update(algorithmRunId, {
            $set: {
                amount_total: totalAmount,
                average_total_price: averageTotalPrice,
                amount_remaining: remainingAmount,
                average_remaining_price: averageRemainingPrice
            }
        })
    } else {
        console.log("there's no match for algorithm run id in database to add total amount")
    }
}

export const addExecutedAmountAndPriceToAlgorithmRunNoFiber = function(algorithmRunId, amount, price){
    var match = AlgorithmRuns.findOne(algorithmRunId);
    if(match){
        console.log("adding executed amount and price to algorithm run id: ", algorithmRunId);
        console.log("matching algorithmRun", match);
        console.log("amount", amount);
        console.log("price", price);
        var amountAbs = Math.abs(amount);

        // update amount_executed and average_executed_price
        var executedAmount = match.amount_executed + amountAbs;
        var executedPrice = match.average_executed_price * match.amount_executed + amountAbs * price;
        var averageExecutedPrice = executedPrice / executedAmount;

        // update amount_remaining and average_remaining_price
        var remainingAmount = match.amount_remaining - amountAbs;
        var remainingPrice = remainingAmount == 0 ? 0 : match.average_remaining_price * match.amount_remaining - amountAbs * price;
        var averageRemainingPrice = remainingAmount == 0 ? 0 : remainingPrice / remainingAmount;

        console.log("executedAmount: ", executedAmount, " executedPrice: ", executedPrice, " average total price: ", averageExecutedPrice);
        console.log("remainingAmount: ", remainingAmount, " remaining price: ", remainingPrice, " average remaining price: ", averageRemainingPrice);

        insertUpdateLogNoFiber(match.algorithm_id, match.exchange, match.symbol, "Updating Executed Amount on Algorithm Run. " +
            "executedAmount: " + executedAmount + " executedPrice: " + executedPrice + " average total price: " + averageExecutedPrice +
            "remainingAmount: " + remainingAmount + " remaining price: " + remainingPrice + " average remaining price: " + averageRemainingPrice);

        AlgorithmRuns.update(algorithmRunId, {
            $set: {
                amount_executed: executedAmount,
                average_executed_price: averageExecutedPrice,
                amount_remaining: remainingAmount,
                average_remaining_price: averageRemainingPrice
            }
        })

    } else {
        console.log("there's no match for algorithm run id in database to add executed amount")
    }
}


export const addOrderIdToAlgorithmRunNoFiber = function( algorithmRunId, orderId){
    console.log("adding order to algorithm run");
    console.log("algorithmRunId: ", algorithmRunId);
    console.log("orderId: ", orderId);
    var match = AlgorithmRuns.findOne(algorithmRunId);
    if(match){
        var order_ids = match.order_ids;
        order_ids.push(orderId);
        AlgorithmRuns.update(algorithmRunId, {
            $set: {order_ids: order_ids}
        })
    } else {
        console.log("there's no match for algorithm run id in database to add order id")
    }
}