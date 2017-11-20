import BitfinexAPI from '/imports/api/bitfinex/lib/restClient';

var bitfinexKey = Meteor.settings.bitfinex.trading.key;
var bitfinexSecret = Meteor.settings.bitfinex.trading.secret;

// console.log("outside of calls");
// console.log("bitfinex key", bitfinexKey);
// console.log("bitfinex secret", bitfinexSecret);

const bitfinexRestClient = new BitfinexAPI({key: bitfinexKey, secret: bitfinexSecret})

export const getAllSymbols = bitfinexRestClient.getAllSymbols;

export const getWalletBalances = bitfinexRestClient.getWalletBalances;

export const getOrderBook = bitfinexRestClient.getOrderBook;

export const getMyActiveOrders = bitfinexRestClient.getMyActiveOrders;

export const getMyOrderStatus = bitfinexRestClient.getMyOrderStatus;

export const newOrder = bitfinexRestClient.newOrder;

export const replaceOrder = bitfinexRestClient.replaceOrder;

export const cancelOrder = bitfinexRestClient.cancelOrder;

export const getMyActivePositions = bitfinexRestClient.getMyActivePositions;

