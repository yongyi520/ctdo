import { Orders } from '/imports/api/orders/orders.js';

import { findAllActiveAlgorithmRunsNoFiber } from '/imports/api/algorithm-runs/algorithmRuns-search';

Meteor.methods({
    "allOrders": function(){
        var allOrders = Orders.find().fetch();
        console.log("all orders", allOrders);
    },
    "removeNonActiveAlgorithmRunOrders": function(){
        var activeAlgorithmRunOrderIds = [];
        var activeAlgorithmRuns = findAllActiveAlgorithmRunsNoFiber();

        if(_.isEmpty(activeAlgorithmRuns) == false){
            activeAlgorithmRuns.forEach( activeAlgorithmRun => {
                activeAlgorithmRun.order_ids.forEach( orderId => {
                    activeAlgorithmRunOrderIds.push(orderId);
                })
            })
        }
        console.log("active algorithmRuns", activeAlgorithmRuns);
        console.log("active algorithmRunOrderIds", activeAlgorithmRunOrderIds);
        Orders.remove({
            order_id: {$nin: activeAlgorithmRunOrderIds}
        })
    },
    "resetOrders": function(){
        console.log("resetting orders");
        Orders.remove({});
    }
})