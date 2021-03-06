
/***************************************************************************
 * REST API for the power plant simulator
 ***************************************************************************/


import express from "express";
import PowerPlant from "../models/power-plant";
import Simulation from "../simulation";
import authenticate from "./auth";
import { ElectricityGridDB, eq } from "../database";
import * as utils from "./utils";
var router = express.Router();


/**
 * Get the power plant of the current logged in user.
 */
router.get('/', authenticate('manager'), (req, res) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        return res.status(200).json(state.powerPlants[req.actor.id]);
    } catch(err) {
        console.trace(err);
        console.log("[Power PlantAPI] Failed to find a requested power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find your power plant, please try again later.");
});


/**
 * Register new power plant for a signed up manager.
 */
router.post('/', authenticate('manager'), async (req, res) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let sim = Simulation.getInstance();
        let state = Simulation.getState();
        let plant = PowerPlant.generate(req.actor.id, req.body.name || "");
        state.powerPlants[plant.owner] = plant;
        plant.store(sim);
        return res.status(200).send("You power plant has been registered successfully.");
    } catch(err) {
        console.trace(err);
        await ElectricityGridDB.table('power_plant').remove([eq('owner', req.actor.id)]);
        console.log("[Power PlantAPI] Failed to register power plant, removing possible broken traces in database.");
    }
    return res.status(400).send("Whoops! We failed to register your power plant, please try again later.");
});


/**
 * Delete the power plant from the simulation.
 */
router.delete('/', authenticate('manager'), async (req, res) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        await ElectricityGridDB.table('power_plant').remove([eq('owner', req.actor.id)]);
        delete state.powerPlants[req.actor.id];
        return res.status(200).send("Your power plant was deleted successfully.");
    } catch(err) {
        console.trace(err);
    }
    return res.status(400).send("Whoops! We failed to delete your power plant, please try again later.");
});

/*
 * Update power plant production level.
 */
router.put('/production/level', authenticate('manager'), 
    async (req: express.Request, res: express.Response) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        let plant = state.powerPlants[req.actor.id];
        plant.productionLevel = req.body.newLevel;
        if (plant.productionLevel == req.body.newLevel) {
            return res.status(200).send("Power plant production level was updated");
        } else {
            return res.status(400).send("Power plant production level was not updated");
        }
    } catch(err) {
       console.trace(err);
       console.log("[Power PlantAPI] Failed to find power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to delete your power plant, please try again later.");
});


/**
 * Update power plant market ratio.
 */
router.put('/market-ratio', authenticate('manager'), 
    async (req: express.Request, res: express.Response) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        let plant = state.powerPlants[req.actor.id];
        plant.marketRatio = req.body.newRatio;
        if (plant.marketRatio == req.body.newRatio) {
            return res.status(200).send("Power plant market ratio was updated");
        } else {
            return res.status(400).send("Power plant market ratio was not updated");
        }
    } catch(err) {
        console.trace(err);
        console.log("[Power PlantAPI] Failed to find power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find your power plant, please try again later.");
});


/**
 * Start power plant.
 */
router.put('/start', authenticate('manager'), (req, res) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        state.powerPlants[req.actor.id].start();
        return res.status(200).send("Power plant start was called");
    } catch(err) {
        console.trace(err);
        console.log("[Power PlantAPI] Failed to find a requested power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find your power plant, please try again later.");
});


/**
 * Stop power plant.
 */
router.put('/stop', authenticate('manager'), (req, res) => {
    if (req.actor == undefined) return res.send(401).send("Not authenticated!");
    try {
        let state = Simulation.getState();
        state.powerPlants[req.actor.id].stop();
        return res.status(200).send("Power plant stop was called");
    } catch(err) {
        console.trace(err);
        console.log("[Power PlantAPI] Failed to find a requested power plant with id " + req.actor.id + ".");
    }
    return res.status(400).send("Whoops! We failed to find your power plant, please try again later.");
});


export = router;
