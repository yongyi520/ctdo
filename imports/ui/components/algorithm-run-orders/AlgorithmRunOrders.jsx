import React, { Component } from 'react';

require('/imports/ui/components/algorithm-run-orders/AlgorithmRunOrders.sass')

export class AlgorithmRunOrders extends Component {

    getActiveOrders(){
        var activeOrders = _.filter(this.props.algorithmRunOrders, function(order){
            return order.status == 'ACTIVE'
        });
        return activeOrders;
    }

    getInactiveOrders(){
        var inactiveOrders = _.filter(this.props.algorithmRunOrders, function(order){
            return order.status != 'ACTIVE'
        });
        return inactiveOrders;
    }

    render(){
        console.log("algorithm run orders", this.props.algorithmRunOrders)
        return (
            <div id="algorithm-run-orders-panel">

                <div className="orders-display active-orders">

                    <div className="order-row header-row">
                        <div className="order-id header">Id</div>
                        <div className="side header">Side</div>
                        <div className="amount header">Amount</div>
                        <div className="price header">Price</div>
                    </div>

                    {this.getActiveOrders().map( order => {
                        return <div key={order._id} className="order-row">
                            <div className="order-id">{order.order_id}</div>
                            <div className="side">{order.side}</div>
                            <div className="amount">{order.original_amount}</div>
                            <div className="price">{order.price}</div>
                        </div>
                    })}
                </div>
                <div className="orders-display inactive-orders">
                    <div className="order-row header-row">
                        <div className="order-id header">Id</div>
                        <div className="side header">Side</div>
                        <div className="amount header">Amount</div>
                        <div className="price header">Price</div>
                    </div>

                    {this.getInactiveOrders().map( order => {
                        return <div key={order._id} className="order-row">
                            <div className="order-id">{order.order_id}</div>
                            <div className="side">{order.side}</div>
                            <div className="amount">{order.original_amount}</div>
                            <div className="price">{order.price}</div>
                        </div>
                    })}
                </div>
            </div>
        )
    }
}