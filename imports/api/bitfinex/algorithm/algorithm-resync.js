import { resyncMartingaleBitfinex } from '/imports/api/bitfinex/algorithm/martingale/martingale-bitfinex.js';

import Future from 'fibers/future';

export const resyncBitfinexAlgorithms = function(){
    resyncMartingaleBitfinex();
}.future()