import { SystemLogs } from '/imports/api/system-logs/system-logs.js';

import Future from 'fibers/future.js';

export const insertUpdateLogNoFiber = function(algorithm_id, exchange, symbol, message){
    var newLog = {
        algorithm_id: algorithm_id,
        exchange: exchange,
        symbol: symbol,
        type: "UPDATE",
        log: message
    }
    SystemLogs.insert(newLog);
}

export const insertErrorLogNoFiber = function(algorithm_id, exchange, symbol, message){
    var newLog = {
        algorithm_id: algorithm_id,
        exchange: exchange,
        symbol: symbol,
        type: "ERROR",
        log: message
    }
    SystemLogs.insert(newLog);
}

export const insertErrorLogFiber = function(algorithm_id, exchange, symbol, message){
    var newLog = {
        algorithm_id: algorithm_id,
        exchange: exchange,
        symbol: symbol,
        type: "ERROR",
        log: message
    }
    SystemLogs.insert(newLog);
}.future()
