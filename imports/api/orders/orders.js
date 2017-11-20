export const Orders = new Meteor.Collection("Orders");

OrdersSchema = new SimpleSchema({
    order_id: {
        type: Number
    },
    exchange: {
        type: String
    },
    symbol: {
        type: String
    },
    type: {
        type: String
    },
    side: {
        type: String
    },
    price: {
        type: Number,
        decimal: true
    },
    average_executed_price: {
      type: Number,
        decimal: true
    },
    original_amount: {
        type: Number,
        decimal: true
    },
    remaining_amount: {
        type: Number,
        decimal: true
    },
    executed_amount: {
      type: Number,
        decimal: true
    },
    status: {
        type: String
    }
})

Orders.attachSchema(OrdersSchema)