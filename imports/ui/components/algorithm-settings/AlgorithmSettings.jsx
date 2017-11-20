import React, { Component } from 'react';

import classNames from 'classnames'

import 'react-switch-button/dist/react-switch-button.css';
require('/imports/ui/components/algorithm-settings/AlgorithmSettings.sass')

export class AlgorithmSettings extends Component {

    updateAlgorithmSettings(){
        console.log("updating algorithm settings");
        var updateAlgorithmSettingsData = {
            start_amount: parseFloat(this.refs.startAmount.value),
            next_step_percentage: parseFloat(this.refs.nexStepPercentage.value),
            reset_percentage: parseFloat(this.refs.resetPercentage.value),
            stop_loss_percentage: parseFloat(this.refs.stopLossPercentage.value),
            max_margin_amount: parseFloat(this.refs.maxMarginAmount.value)
        }
        console.log("update algorithm data", updateAlgorithmSettingsData);
        Meteor.call("updateAlgorithmSettings", this.props.settings._id, updateAlgorithmSettingsData)
    }

    algorithmOnOff(state){
        if(state == true){
            Meteor.call("turnOnAlgorithm", this.props.settings._id)
        } else if(state == false) {
            Meteor.call("turnOffAlgorithm", this.props.settings._id)
        }
    }

    render(){
        console.log("algorithm settings", this.props.settings);
        return (
            <div id="algorithm-setting-panel">
                { this.props.settings ?
                    <div className="settings">
                        <div className="settings-row">
                            <div className="field_name">On / Off</div>
                            <div className="input">
                                <button onClick={() => this.algorithmOnOff(true)} className={classNames({on: this.props.settings.is_active})}>ON</button>
                                <button onClick={() => this.algorithmOnOff(false)} className={classNames({off: !this.props.settings.is_active})}>OFF</button>
                            </div>

                        </div>
                        <div className="settings-row">
                            <div className="field_name">Start Amount</div>
                            <div className="input">
                                <input ref="startAmount" type="text" key={this.props.settings._id} defaultValue={this.props.settings.start_amount}/>
                            </div>
                        </div>
                        <div className="settings-row">
                            <div className="field_name">Next Step</div>
                            <div className="input">
                                <input ref="nexStepPercentage" type="text" key={this.props.settings._id} defaultValue={this.props.settings.next_step_percentage}/>
                            </div>
                        </div>
                        <div className="settings-row">
                            <div className="field_name">Reset Step</div>
                            <div className="input">
                                <input ref="resetPercentage" type="text" key={this.props.settings._id} defaultValue={this.props.settings.reset_percentage}/>
                            </div>
                        </div>
                        <div className="settings-row">
                            <div className="field_name">Stop Loss</div>
                            <div className="input">
                                <input ref="stopLossPercentage" type="text" key={this.props.settings._id} defaultValue={this.props.settings.stop_loss_percentage}/>
                            </div>
                        </div>
                        <div className="settings-row">
                            <div className="field_name">Max Margin Amount</div>
                            <div className="input">
                                <input ref="maxMarginAmount" type="text" key={this.props.settings._id} defaultValue={this.props.settings.max_margin_amount}/>
                            </div>
                        </div>
                        <div className="settings-action-panel">
                            <button onClick={() => this.updateAlgorithmSettings()}>Update</button>
                        </div>
                    </div>
                    :
                    <div className="settings">
                        <div className="message">
                            Selected Algorithm Has No Algorithm Settings
                        </div>
                    </div>
                }
            </div>
        )
    }
}