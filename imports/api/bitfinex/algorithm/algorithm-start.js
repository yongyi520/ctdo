import { startNewMartingale } from '/imports/api/bitfinex/algorithm/martingale/martingale-bitfinex.js';

// symbol: omgusd, ethusd, neobtc, neousd, omgbtc
// type: SHBL or BLSH
export const startMartingale = function(symbol, type){
    startNewMartingale(symbol, type);
}

// symbol: omgusd, ethusd, neobtc, neousd, omgbtc
// type: BLSH
export const startDailyTrade = function(symbol, type){

}