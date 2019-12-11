
/***************************************************************************
 * The simulator controller handles different actions for the simulator
 * module.
 ***************************************************************************/


var simulator = require('./../models/simulator.js');


/**
 * Returns the wind speed for this hour.
 */
exports.getWindSpeed = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let output = await simulator.getCurrentWindSpeed();
    let json = JSON.stringify(output);
    res.end(json);
}


/**
 * Returns the data of a prosumer with the specified id.
 */
exports.getProsumerData = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');

    let output = await simulator.getProsumerData(req.params.id);
    let json = JSON.stringify(output);
    if (output.status != null) {
        res.status(output.status);
    }
    res.end(json);
}


/**
 * Creates a new prosumer from 
 */
exports.createProsumer = function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    let output = simulator.createProsumer(req.body.id)
    let json = JSON.stringify(output);
    res.end(json);
    
}


/**
 * Sets the buffer settings for a prosumer. 
 */
exports.setProsumerBufferSettings = function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    let output =  simulator.setProsumerBufferSettings(req.params.id, req.params.max, req.params.limit);
    let json = JSON.stringify(output);
    res.end(json);
}


/**
 * Returns the current electricity price.
 */
exports.getElectricityPrice = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    let output = await simulator.getElectricityPrice();
    let json = JSON.stringify(output);
    res.end(json);
}


/**
 * Returns the wind speed for every hour in the day and sim pararams.
 * The next day is generated afterward, used to look through the data.
 */
exports.dumpSimulationData = async function(req, res) {
    res.setHeader('Content-Type', 'application/json');
    let output = await simulator.dumpSimulationData();
    let json = JSON.stringify(output);
    res.end(json);
}
