export const AlgorithmRuns = new Meteor.Collection("AlgorithmRuns");

AlgorithmRunsSchema = new SimpleSchema({
    algorithm_id: {
        type: String,
    },
    exchange: {
        type: String
    },
    symbol: {
        type: String
    },
    order_ids: {
        type: [Number]
    },
    status: {
        type: String
    },
    amount_total: {
        type: Number,
        decimal: true
    },
    amount_executed: {
        type: Number,
        decimal: true
    },
    amount_remaining: {
        type: Number,
        decimal: true
    },
    average_executed_price: {
        type: Number,
        decimal: true
    },
    average_remaining_price: {
        type: Number,
        decimal: true
    },
    average_total_price: {
        type: Number,
        decimal: true
    }
})

AlgorithmRuns.attachSchema(AlgorithmRunsSchema);