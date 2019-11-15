
/***************************************************************************
 * The simulator instance keeps track of the model 
 ***************************************************************************/


var WindSim = require('./../simulator/windsim.js');
var ProsumerSim = require('./../simulator/prosumer-sim.js');
var electricity = require('./../simulator/calculateElectricityPrice.js');


/**
 * Simulator instance model.
 */
class Simulator {
    /**
     * Creates a new simulator model.
     */
    constructor() {
        var max = Math.random() * 20 + 5;
        var stdev = Math.random() * 10 + 1;
        this.wind = new WindSim(max, stdev);
        this.prosumers = [];
    }


    /**
     * Returns the current wind speed for this hour.
     */
    getCurrentWindSpeed() {
        var date = new Date();
        return {
            wind_speed: this.wind.getWindSpeed(date.getHours()),
            hour: date.getHours(),
        };
    }

    
    /**
     * Returns the electricity production and consumption
     */
    getProsumerData(id) {
        var date = new Date();
        if (id >= 0 && id < this.prosumers.length) {
            let prosumer = this.prosumers[id];
            return {
                consumption: prosumer.getElectricityConsumption(date.getHours()),
                production: prosumer.getElectricityProduction(date.getHours()),
                hour: date.getHours(),
            };
        } else {
            return {
                status: 400,
                message: "requested prosumer with id " + id + " does not exist",
            };
        }
    }


    /**
     * Creates a new prosumer and returns the id.
     */
    createProsumer() {
        var p_scl = Math.random() * 0.9 + 0.1;
        var c_max = Math.random() * 2 + 0.3;
        var c_stdev = Math.random() + 0.1;
        var prosumer = new ProsumerSim(this.wind, p_scl, c_max, c_stdev);
        var id = this.prosumers.length;
        this.prosumers.push(prosumer);
        return {id: id};
    }


    /**
     * Get the current electricity price.
     */
    getElectricityPrice() {
        var date = new Date();
        var wind_speed = this.wind.getWindSpeed(date.getHours());
        var demand = this.calculateDemand();
        var price = electricity.calculateElectricityPrice(demand, wind_speed);
        return {
            electricity_price: price,
            hour: date.getHours(),
        };
    }


    /**
     * Gets the electricity demand, which is equal to the total amount of electricity consumed.
     */
    calculateDemand() {
        var total_electricity_consumption = 0;
        for (var i = 0; i < this.prosumers.length; i++) {
            total_electricity_consumption += this.prosumers[i].getElectricityConsumption(this.date.getHours);
        }
        return total_electricity_consumption;
    }
}


module.exports = new Simulator();
