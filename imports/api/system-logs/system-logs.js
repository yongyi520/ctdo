export const SystemLogs = new Mongo.Collection("SystemLogs");

SystemLogsSchema = new SimpleSchema({
    algorithm_id: {
        type: String
    },
    exchange: {
        type: String
    },
    symbol: {
        type: String
    },
    type: {
        type: String // update || error
    },
    log: {
        type: String
    }
})

SystemLogs.attachSchema(SystemLogsSchema);