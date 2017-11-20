import React, { Component } from 'react';

require('/imports/ui/components/algorithm-runs/AlgorithmRuns.sass')

export class AlgorithmRuns extends Component {
    render(){
        console.log("algorithm run", this.props.algorithmRun)
        return (
            <div id="algorithm-run-panel">
                { (this.props.algorithmRun) ?
                    <div className="run">
                        <div className="detail">
                            <p className="detail_label">Total Amount</p>
                            <p className="detail_amount">{this.props.algorithmRun.amount_total}</p>
                        </div>
                        <div className="detail">
                            <p className="detail_label">Executed Amount</p>
                            <p className="detail_amount">{this.props.algorithmRun.amount_executed}</p>
                        </div>
                        <div className="detail">
                            <p className="detail_label">Remaining Amount</p>
                            <p className="detail_amount">{this.props.algorithmRun.amount_remaining}</p>
                        </div>

                    </div>
                    :
                    <div className="run">
                        <div className="message">Selected Algorithm Has No Active Algorithm Run</div>
                    </div>
                }

            </div>
        )
    }
}