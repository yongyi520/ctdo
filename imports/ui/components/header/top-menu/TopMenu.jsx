import React, { Component } from 'react';

import { Link } from 'react-router-dom'

require('/imports/ui/components/header/top-menu/TopMenu.sass')

export default class TopMenu extends Component {
    render(){
        return (
            <div className="top-menu">
                <div className="left">

                </div>
                <div className="mid">

                </div>
                <div className="right">
                    <ul>
                        <li><Link to="/">Bitfinex</Link></li>
                        <li><Link to="/test">Testing</Link></li>
                        <li><Link to="/dashboard">Dashboard</Link></li>
                        <li><Link to="/home">Home</Link></li>
                    </ul>
                </div>
            </div>
        )
    }
}
