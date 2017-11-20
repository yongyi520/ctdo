import React, { Component } from 'react';

import {
    BrowserRouter as Router,
    Route, Link } from 'react-router-dom'

// top menu
import TopMenu from '/imports/ui/components/header/top-menu/TopMenu.jsx';

// body pages
import BitfinexContainer from '/imports/ui/components/exchange/bitfinex/BitfinexContainer.jsx';
import BitfinexTesting from '/imports/ui/components/debug/BitfinexTesting';
import Home from '/imports/ui/components/home/Home.jsx';
import Dashboard from '/imports/ui/components/dashboard/Dashboard.jsx';

import '/imports/ui/App.sass'

export default class App extends Component {

    constructor(props){
        super(props);
    }

    render() {
        return (
            <Router>
                <div className="body container-fluid">
                    <TopMenu/>
                    <Route exact path="/" component={BitfinexContainer}/>
                    <Route path="/dashboard" component={Dashboard}/>
                    <Route path="/home" component={Home}/>
                    <Route path="/test" component={BitfinexTesting}/>
                </div>
            </Router>
        )
    }
}