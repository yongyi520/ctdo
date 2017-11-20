export const AlgorithmSettings = new Meteor.Collection("AlgorithmSettings");

AlgorithmSettingsSchema = new SimpleSchema({
    algorithm_id: {
        type: String
    },
    exchange: {
        type: String
    },
    symbol: {
        type: String
    },
    is_active: {
        type: Boolean
    },
    next_step_percentage: {
        type: Number,
        decimal: true,
        optional: true
    },
    reset_percentage: {
        type: Number,
        decimal: true,
        optional: true
    },
    stop_loss_percentage: {
      type: Number,
        decimal: true,
        optional: true
    },
    start_amount: {
        type: Number,
        decimal: true,
        optional: true
    },
    max_margin_amount: {
        type: Number,
        decimal: true,
        optional: true
    }
})

AlgorithmSettings.attachSchema(AlgorithmSettingsSchema)