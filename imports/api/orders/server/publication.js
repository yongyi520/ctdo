import { Orders } from '/imports/api/orders/orders.js';

Meteor.publish('Orders', function() {
    return Orders.find({}, {limit: 500});
})