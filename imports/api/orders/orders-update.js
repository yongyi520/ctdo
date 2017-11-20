import { Orders } from '/imports/api/orders/orders.js';

// libs
import Future from 'fibers/future';

export const updateCancelOrder = function(orderId){
    console.log("update cancel order id: ", orderId);
    var match = Orders.findOne({order_id: orderId});
    console.log("matching order", match);
    if(match){
        console.log("cancelling order with order id: ", orderId);
        Orders.update({order_id: orderId}, {
            $set: {status: 'CANCELED'}
        })
    } else {
        console.log("there's no match in orders database to cancel order id: ", orderId);
    }
}.future()

export const updateExecutedOrder = function(orderId){
    console.log("update executed order id: ", orderId);
    var match = Orders.findOne({order_id: orderId});
    console.log("matching order", match);
    if(match){
        console.log("updating executed order status with order id: ", orderId);
        Orders.update({order_id: orderId}, {
            $set: {status: 'EXECUTED'}
        })
    } else {
        console.log("there's no match in orders database to update executed order id: ", orderId)
    }
}.future()

export const updateExecutedOrderNoFiber = function(orderId){
    console.log("update executed order id: ", orderId);
    var match = Orders.findOne({order_id: orderId});
    console.log("matching order", match);
    if(match){
        console.log("updating executed order status with order id: ", orderId);
        Orders.update({order_id: orderId}, {
            $set: {status: 'EXECUTED'}
        })
    } else {
        console.log("there's no match in orders database to update executed order id: ", orderId)
    }
}

export const insertOrder = function( data ){
    Orders.insert(data);
}

