import React, { Component } from 'react';

require('/imports/ui/components/debug/BitfinexTesting.sass')

export default class BitfinexTesting extends Component {

    martingaleNextOrders(){
        var order_id = parseInt(this.refs.orderId.value);
        Meteor.call("bitfinex.martingaleNextOrders", order_id);
    }

    getWalletBalances(){
        Meteor.call("bitfinex.getWalletBalances");
    }

    getAllSymbols(){
        Meteor.call("bitfinex.getAllSymbols");
    }

    getMyActivePositions(){
        Meteor.call("bitfinex.getMyActivePositions");
    }

    getOrderBook(){
        Meteor.call("bitfinex.getOrderBook");
    }

    getActiveOrders(){
        Meteor.call("bitfinex.getMyActiveOrders");
    }

    getMyOrderStatus(){
        Meteor.call("bitfinex.getMyOrderStatus");
    }

    newOrder(){
        Meteor.call("bitfinex.newOrder");
    }

    replaceOrder(){
        Meteor.call("bitfinex.replaceOrder");
    }

    cancelOrder(){
        Meteor.call("bitfinex.cancelOrder");
    }

    restartSocket(){
        Meteor.call('bitfinex.restartSocket')
    }

    openSocket(){
        Meteor.call("bitfinex.openSocket");
    }

    ping(){
        Meteor.call("bitfinex.ping");
    }

    isSocketAlive(){
        Meteor.call("bitfinex.isSocketAlive", (error, alive) => {
            if(alive){
                alert("the socket is live")
            } else {
                alert("the socket is dead")
            }
        });
    }

    initialSellETHUSD(){
        Meteor.call("bitfinex.martingaleSHBL", 'ethusd');
    }

    initialSellETHBTC(){
        Meteor.call("bitfinex.martingaleSHBL", 'ethbtc');
    }

    initialSellOMGUSD(){
        Meteor.call("bitfinex.martingaleSHBL", 'omgusd');
    }

    initialSellOMGBTC(){
        Meteor.call("bitfinex.martingaleSHBL", 'omgbtc');
    }

    initialSellNEOUSD(){
        Meteor.call("bitfinex.martingaleSHBL", 'neousd');
    }

    initialSellNEOBTC(){
        Meteor.call("bitfinex.martingaleSHBL", 'neobtc');
    }

    initialSellXRPUSD(){
        Meteor.call("bitfinex.martingaleSHBL", 'xrpusd');
    }

    initialSellXRPBTC(){
        Meteor.call("bitfinex.martingaleSHBL", 'xrpbtc');
    }

    initialSellETPUSD(){
        Meteor.call("bitfinex.martingaleSHBL", 'etpusd');
    }

    initialBuyETHUSD(){
        Meteor.call("bitfinex.martingaleBLSH", 'ethusd');
    }

    initialBuyETHBTC(){
        Meteor.call("bitfinex.martingaleBLSH", 'ethbtc');
    }

    initialBuyOMGUSD(){
        Meteor.call("bitfinex.martingaleBLSH", 'omgusd');
    }

    initialBuyOMGBTC(){
        Meteor.call("bitfinex.martingaleBLSH", 'omgbtc');
    }

    initialBuyNEOUSD(){
        Meteor.call("bitfinex.martingaleBLSH", 'neousd');
    }

    initialBuyNEOBTC(){
        Meteor.call("bitfinex.martingaleBLSH", 'neobtc');
    }

    initialBuyXRPUSD(){
        Meteor.call("bitfinex.martingaleBLSH", 'xrpusd');
    }

    initialBuyXRPBTC(){
        Meteor.call("bitfinex.martingaleBLSH", 'xrpbtc');
    }

    wssListenerSetup(){
        Meteor.call("bitfinex.wssListenerSetup");
    }

    allOrders(){
        Meteor.call("allOrders");
    }

    removeNonActiveAlgorithmRunOrders(){
        Meteor.call("removeNonActiveAlgorithmRunOrders");
    }

    resetOrders(){
        Meteor.call("resetOrders");
    }

    allAlgorithms(){
        Meteor.call("allAlgorithms");
    }

    resetAlgorithms(){
        Meteor.call("resetAlgorithms");
    }

    addAlgorithm(){
        Meteor.call("addAlgorithm");
    }

    allAlgorithmSettings(){
        Meteor.call("allAlgorithmSettings")
    }

    resetAlgorithmSettings(){
        Meteor.call("resetAlgorithmSettings")
    }

    allAlgorithmRuns(){
        Meteor.call("allAlgorithmRuns")
    }

    removeNonActiveAlgorithmRun(){
        Meteor.call("removeNonActiveAlgorithmRuns");
    }

    removeETHAlgorithmRuns(){

    }

    removeOMGAlgorithmRuns(){
        Meteor.call("removeAlgorithmRuns", "bitfinex", "omgusd");
    }

    resetAlgorithmRuns(){
        Meteor.call("resetAlgorithmRuns")
    }



    render() {
        return (
            <div className="content-wrapper">
                <div id="bitfinex-testing" className="content">
                    <div className="title">
                        <h2>Bitfinex Testing</h2>
                    </div>
                    <div className="main-content">
                        <div className="panel">
                            <h4>Troubleshoot</h4>
                            <input ref="orderId" type="number"/>
                            <button onClick={this.martingaleNextOrders.bind(this)}>Martingale Next Orders</button>
                        </div>
                        <div className="panel">
                            <h4>API General Calls</h4>
                            <button onClick={this.getWalletBalances.bind(this)}>Wallet Balances</button>
                            <button onClick={this.getAllSymbols.bind(this)}>All Symbols</button>
                        </div>
                        <div className="panel">
                            <h4>API Order Calls</h4>
                            <button onClick={this.getMyActivePositions.bind(this)}>Active Positions</button>
                            <button onClick={this.getOrderBook.bind(this)}>Order Book</button>
                            <button onClick={this.getActiveOrders.bind(this)}>Active Orders</button>
                            <button onClick={this.getMyOrderStatus.bind(this)}>Order Status</button>
                            <button onClick={this.newOrder.bind(this)}>New Order</button>
                            <button onClick={this.replaceOrder.bind(this)}>Replace Order</button>
                            <button onClick={this.cancelOrder.bind(this)}>Cancel Order</button>
                        </div>
                        <div className="panel">
                            <h4>WSS Calls</h4>
                            <button onClick={this.restartSocket.bind(this)}>Restart Socket</button>
                            <button onClick={this.openSocket.bind(this)}>Open Socket</button>
                            <button onClick={this.ping.bind(this)}>Ping</button>
                            <button onClick={this.isSocketAlive.bind(this)}>Is Socket Alive</button>
                        </div>
                        <div className="panel">
                            <h4>Martingale Algorithm Test</h4>
                            <h5>SHBL</h5>
                            <button onClick={this.initialSellETHUSD.bind(this)}>ETHUSD</button>
                            <button onClick={this.initialSellETHBTC.bind(this)}>ETHBTC</button>
                            <button onClick={this.initialSellOMGUSD.bind(this)}>OMGUSD</button>
                            <button onClick={this.initialSellOMGBTC.bind(this)}>OMGBTC</button>
                            <button onClick={this.initialSellNEOUSD.bind(this)}>NEOUSD</button>
                            <button onClick={this.initialSellNEOBTC.bind(this)}>NEOBTC</button>
                            <button onClick={this.initialSellXRPUSD.bind(this)}>XRPUSD</button>
                            <button onClick={this.initialSellXRPBTC.bind(this)}>XRPBTC</button>
                            <button onClick={this.initialSellETPUSD.bind(this)}>ETPUSD</button>
                            <h5>BLSH</h5>
                            <button onClick={this.initialBuyETHUSD.bind(this)}>ETHUSD</button>
                            <button onClick={this.initialBuyETHBTC.bind(this)}>ETHBTC</button>
                            <button onClick={this.initialBuyOMGUSD.bind(this)}>OMGUSD</button>
                            <button onClick={this.initialBuyOMGBTC.bind(this)}>OMGBTC</button>
                            <button onClick={this.initialBuyNEOUSD.bind(this)}>NEOUSD</button>
                            <button onClick={this.initialBuyNEOBTC.bind(this)}>NEOBTC</button>
                            <button onClick={this.initialBuyXRPUSD.bind(this)}>XRPUSD</button>
                            <button onClick={this.initialBuyXRPBTC.bind(this)}>XRPBTC</button>
                        </div>
                        <div className="panel">
                            <h4>Orders Collection</h4>
                            <button onClick={this.allOrders.bind(this)}>All Orders</button>
                            <button onClick={this.removeNonActiveAlgorithmRunOrders.bind(this)}>Remove Non Active Algorithm Run Orders</button>
                            <button onClick={this.resetOrders.bind(this)}>Reset Orders</button>
                        </div>
                        <div className="panel">
                            <h4>Algorithm Collection</h4>
                            <button onClick={this.allAlgorithms.bind(this)}>All Algorithms</button>
                            <button onClick={this.resetAlgorithms.bind(this)}>Reset Algorithms</button>
                            <button onClick={this.addAlgorithm.bind(this)}>Add Algorithm</button>
                        </div>
                        <div className="panel">
                            <h4>Algorithm Settings Collection</h4>
                            <button onClick={this.allAlgorithmSettings.bind(this)}>All Algorithms Settings</button>
                            <button onClick={this.resetAlgorithmSettings.bind(this)}>Reset Algorithms Settings</button>
                        </div>
                        <div className="panel">
                            <h4>Algorithm Runs Collection</h4>
                            <button onClick={this.allAlgorithmRuns.bind(this)}>All Algorithms Runs</button>
                            <button onClick={this.removeNonActiveAlgorithmRun.bind(this)}>Remove Non-Active Algorithm Runs</button>
                            <button onClick={this.removeETHAlgorithmRuns.bind(this)}>Remove ETH Algorithm Runs</button>
                            <button onClick={this.removeOMGAlgorithmRuns.bind(this)}>Remove OMG Algorithm Runs</button>
                            <button onClick={this.resetAlgorithmRuns.bind(this)}>Reset Algorithms Runs</button>
                        </div>

                    </div>
                </div>
            </div>
        )
    }
}