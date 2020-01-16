/***************************************************************************
 * The market controller handles different actions specific to the
 * market.
 ***************************************************************************/


const fetch = require('node-fetch');
const { URLSearchParams } = require('url');
var Manager = require('../models/manager');


/**
 * The market controller defines different actions that
 * be done to the market.
 */
class MarketController {
    

    /**
     * Get suggested price.
     * Should provide an auth.verify middleware for accessing this.
     */
    async getSuggestedPrice(req, res) {
        try {
            const response = await fetch(`http://simulator:3000/api/market/suggested-price`, {
                headers: {'Authorization': 'Bearer ' + req.session.token}
            });
            const powerPlantData = await response.json();
            res.send(JSON.stringify(powerPlantData));
        } catch (err) {
            console.trace(err);
            req.whoops();
        }
    }


    /**
     * Updates the current market price.
     * Should provide an auth.verify middleware for accessing this.
     */
    async updatePrice(req, res) {
        try {
            const manager = await Manager.findOne({id: req.userId});
            manager.online();
            
            const params = new URLSearchParams();
            params.append('newPrice', req.body.newPrice);
            const response = await fetch('http://simulator:3000/api/market/update/price', {
                method: 'POST',
                headers: {'Authorization': 'Bearer ' + req.session.token},
                body: params
            });
            res.status(response.status);
        } catch (err) {
            console.trace(err);
            req.whoops();
        }
        return res.redirect('/manager/control-panel');
    }
}


/**
 * Expose the market controller instance.
 */
module.exports = new MarketController();
