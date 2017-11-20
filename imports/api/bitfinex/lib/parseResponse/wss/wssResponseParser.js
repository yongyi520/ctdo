

export const parseWssOrder = function(response){
    return {
        order_id: response[0],
        symbol: response[1].toLowerCase(),
        amount: response[2], // positive for buy, negative for sell
        original_amount: response[3], // positive for buy, negative for sell
        type: response[4],
        status: response[5],
        original_price: response[6],
        average_price: response[7],
        created_at: response[8],

    }
}

export const convertApiParsedOrderToWssParsedOrder = function(parsedApiOrder){

    return {
        order_id: parsedApiOrder.order_id,
        symbol: parsedApiOrder.symbol,
        amount: parsedApiOrder.side == 'buy' ? parsedApiOrder.executed_amount : parsedApiOrder.executed_amount * -1, // positive for buy, negative for sell
        original_amount: parsedApiOrder.side == 'buy' ? parsedApiOrder.original_amount : parsedApiOrder.original_amount * -1, // positive for buy, negative for sell
        type: parsedApiOrder.type,
        status: parsedApiOrder.status, // need to fix this
        original_price: parsedApiOrder.price,
        average_price: parsedApiOrder.average_executed_price,
        created_at: null
    }
}