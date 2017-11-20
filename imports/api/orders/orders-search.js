import { Orders } from '/imports/api/orders/orders.js';

import Future from 'fibers/future.js';

export const activeOrdersWithOrderIdNoFiber = function(order_ids){
    return Orders.find({
        order_id: {$in: order_ids},
        status: 'ACTIVE'
    }).fetch();
}

export const activeOrdersWithOrderId = function(order_ids){
    return Orders.find({
        order_id: {$in: order_ids},
        status: 'ACTIVE'
    }).fetch();
}.future()

export const findOneOrderWithOrderIdNoFiber = function(order_id){
    return Orders.findOne({
        order_id: order_id
    })
}