import { AlgorithmRuns } from '/imports/api/algorithm-runs/algorithm-runs.js';

import Future from 'fibers/future'

export const findActiveAlgorithmRunNoFiber = function(algorithmId, exchange, symbol){
    var searchCriteria = {
        status: 'ACTIVE',
        algorithm_id: algorithmId,
        exchange: exchange,
        symbol: symbol
    }
    return AlgorithmRuns.findOne(searchCriteria);
}

export const findActiveAlgorithmRunWithOrderId = function(orderId){
    var searchCriteria = {
        status: 'ACTIVE'
    }
    var algorithmRuns = AlgorithmRuns.find(searchCriteria).fetch();
    if(algorithmRuns){
        var algorithmRun = null;
        _.forEach(algorithmRuns, ( run ) => {
            if(_.indexOf(run.order_ids, orderId) > -1)
                algorithmRun = run;
        })
        return algorithmRun;
    } else {
        return null
    }
}.future()

export const findActiveAlgorithmRunWithOrderIdNoFiber = function(orderId){
    var searchCriteria = {
        status: 'ACTIVE'
    }
    var algorithmRuns = AlgorithmRuns.find(searchCriteria).fetch();
    if(algorithmRuns){
        var algorithmRun = null;
        _.forEach(algorithmRuns, ( run ) => {
            if(_.indexOf(run.order_ids, orderId) > -1)
                algorithmRun = run;
        })
        return algorithmRun;
    } else {
        return null
    }
}

export const findAllActiveAlgorithmRunsNoFiber = function(){
    var searchCriteria = {
        status: 'ACTIVE'
    }
    var algorithmRuns = AlgorithmRuns.find(searchCriteria).fetch();
    if(algorithmRuns){
        return algorithmRuns;
    } else {
        return null
    }
}