
/***************************************************************************
 * REST API for the market state.
 ***************************************************************************/


import express from "express";
import Simulation from "../simulation";
import authenticate from "./auth";
var router = express.Router();


/**
 * Get current market price.
 */
router.put('/price', authenticate('manager'), (req: express.Request, res: express.Response) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
            let state = Simulation.getState();
            let market = state.powerPlants[req.actor.id].market;
            market.price = req.body.newPrice;
            if (market.price == req.body.newPrice) {
                return res.status(200).send("Market price was updated");
            } else {
                return res.status(400).send("Market price was not updated");
            }
    } catch(err) {
        console.trace(err);
        console.log("[MarketAPI] Failed to find a requested power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find your market, please try again later.");
});


/**
 * Get the markets suggested price.
 */
router.get('/suggested-price', authenticate('manager'), 
    (req: express.Request, res: express.Response) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        return res.status(200).json(state.powerPlants[req.actor.id].market.suggestedPrice);
    } catch(err) {
        console.trace(err);
        console.log("[MarketAPI] Failed to find a requested power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find your power plant, please try again later.");
});


/**
 * Get the market.
 */
router.get('/', authenticate(), 
    (req: express.Request, res: express.Response) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        if (req.actor.role == 'prosumer') {
            const market =  state.houses[req.actor.id].powerPlant?.market;
            if (market != undefined) {
                return res.status(200).json(market);
            } else {
                return res.status(400).send("No market found");
            }
        } else if (req.actor.role == 'manager') {
            return res.status(200).json(state.powerPlants[req.actor.id].market);
        } else {
            return res.status(400).send("Permission denied! Only accessable by prosumers and managers.");
        }
    } catch(err) {
        console.trace(err);
        console.log("[MarketAPI] Failed to find a requested power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find requested house, please try again later.");
});


/**
 * Get the current market price.
 */
router.get('/price', authenticate(), 
    (req: express.Request, res: express.Response) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        if (req.actor.role == 'prosumer') {
            const price = state.houses[req.actor.id].powerPlant?.market.price;
            if (price != undefined) {
                return res.status(200).json(price);
            } else {
                return res.status(400).send("No market found");
            }
        } else if (req.actor.role == 'manager') {
            return res.status(200).json(state.powerPlants[req.actor.id].market.price);
        } else {
            return res.status(400).send("Permission denied! Only accessable by prosumers and managers.");
        }
    } catch(err) {
        console.trace(err);
        console.log("[MarketAPI] Failed to find a requested power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find requested house, please try again later.");
});


export = router;
