
export const parseApiOrder = function(response){
    return {
        order_id: response.id,
        exchange: response.exchange,
        symbol: response.symbol,
        status: response.is_live ? 'ACTIVE' : ( response.is_cancelled ? 'CANCELED' : 'EXECUTED'),
        type: response.type,
        side: response.side,
        price: parseFloat(response.price),
        average_executed_price: parseFloat(response.avg_execution_price),
        original_amount: parseFloat(response.original_amount),
        remaining_amount: parseFloat(response.remaining_amount),
        executed_amount: parseFloat(response.executed_amount)
    }
}

/**
 * {
 *  type: 'exchange || margin || funding'
 *  currency: 'btc || eth || omg || neo || ltc'
 *  amount: 0.0
 *  available: 0.0
 * }
 * @param response
 * @returns {*}
 */
export const parseApiWallet = function(response){
    var wallets = [];
    _.forEach(response, balance => {
        var wallet = {
            type: balance.type,
            currency: balance.currency,
            amount: parseFloat(balance.amount),
            available: parseFloat(balance.available)
        }
        wallets.push(wallet);
    })
    return wallets;
}

export const parseApiActivePositions = function(activePositionApiResponse){
    var activePositions = [];
    _.forEach(activePositionApiResponse, position => {
        var position = {
            position_id: position.id,
            symbol: position.symbol,
            status: position.status,
            base: parseFloat(position.base),
            amount: parseFloat(position.amount),
            timestamp: parseFloat(position.timestamp),
            swap: parseFloat(position.swap),
            pl: parseFloat(position.pl)
        }
        activePositions.push(position);
    })
    // console.log("active positions", activePositions);
    return activePositions;
}