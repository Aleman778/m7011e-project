
/***************************************************************************
 * The wind turbine models generation of electricity based on the
 * wind in the simulation.
 ***************************************************************************/

import uuid from "uuid";
import Simulation from "../simulation";
import { randomFloat, HOUR_MILLISEC } from "./utils";
import { ElectricityGridDB, eq } from "../database";


/**
 * The wind turbine models the electricity generated based on the wind speed.
 */
export default class WindTurbine {
    /**
     * The owner of this wind turbine.
     */
    private _owner: string;
    
    /**
     * The current power generated.
     */
    private _currentPower: number;

    /**
     * The number of milliseconds it takes to repair the broken wind turbine.
     */
    private _repairTime: number;

    /**
     * The maximum power that can be generated from this wind turbine.
     */
    private maxPower: number;

    /**
     * The ratio between the wind speed and the generated electricty.
     */
    private productionRatio: number;

    /**
     * The frequency at which this turbine breaks down.
     */
    private breakDownFreq: number;
    
    /**
     * Is the wind turbine broken at the moment?
     */
    public broken: boolean;

    /**
     * The time when this wind turbine was created.
     */
    private createdAt: Date;

    /**
     * The time when the wind turbine was last updated in the database.
     */
    private updatedAt: Date;
    
    
    /**
     * Create a new wind turbine with the given parameters.
     * @param {WindTurbineData} data the wind turbine data
     * @param {string} owner the house owner uuid
     */
    constructor(data: WindTurbineData) {
        let sim = Simulation.getInstance();
        this._owner = data.owner;
        this._currentPower = +(data.current_power || 0);
        this._repairTime = +(data.repair_time || 0);
        this.maxPower = +data.max_power;
        this.productionRatio = +data.production_ratio;
        this.breakDownFreq = +data.break_down_freq;
        this.broken = data.broken || false;
        this.createdAt = data.created_at || sim.time;
        this.updatedAt = data.updated_at || sim.time;
    }


    /**
     * Generates a new wind turbine model for the given house owner.
     */
    static generate(owner: string) {
        return new WindTurbine({
            owner: owner,
            max_power: randomFloat(5.0, 6.5),
            production_ratio: randomFloat(0.5, 0.8),
            break_down_freq: randomFloat(0.005, 0.01),
        });
    }
    

    /**
     * Find a wind turbine based on the owner id.
     * @param {string} owner the owner uuid
     * @returns {Promise<WindTurbine>} the wind turbine if found
     */
    static async findByOwner(owner: string): Promise<WindTurbine> {
        try {
            let data = await ElectricityGridDB.table('wind_turbine')
                .select<WindTurbineData>([], [eq('owner', owner)]);
            if (data.length == 1) {
                return new WindTurbine(data[0]);
            } else {
                return Promise.reject("Could not find any wind turbine with id " + owner);
            }
        } catch(err) {
            return Promise.reject("Failed to retreive wind turbine data from database");
        }
    }

    
    /**
     * The simulation update event.
     * @param {Simulation} sim the current simulation
     */
    async update(sim: Simulation) {
        if (this.broken) {
            this.repairTime -= sim.deltaTime;
            this.currentPower = 0;
            if (this.repairTime <= 0) {
                this.broken = false;
            }
        } else {
            if (Math.random() < (this.breakDownFreq * sim.deltaHour)) {
                this.repairTime = randomFloat(0.1, 24.0) * HOUR_MILLISEC;
                this.broken = true;
                return;
            }
            let wind = sim.state?.wind;
            let speed = await wind?.getSpeed(sim.time);
            if (speed != undefined) {
                this.currentPower = speed.value * this.productionRatio * sim.deltaHour * 0.2;
            } else {
                this.currentPower = 0;
            }
        }
    }


    /**
     * Stores the current status of the wind turbine in the database.
     */
    async store(sim: Simulation) {
        this.updatedAt = sim.time;
        await ElectricityGridDB.table('wind_turbine').insert_or_update(this.data, ['owner']);
    }


    /**
     * Setter for the current generated power.
     * Makes sure that the value is within set
     * range for this turbine [0, maxPower].
     * @param {number} power the power generated
     */
    set currentPower(power: number) {
        if (power > this.maxPower) {
            this._currentPower = this.maxPower;
        } else if (power < 0) {
            this._currentPower = 0;
        } else {
            this._currentPower = power;
        }
    }


    /**
     * Getter for the currently generated power at this simulation step.
     * @returns {number} the current power
     */
    get currentPower(): number {
        return this._currentPower;
    }


    /**
     * Setter for the repair time when wind turbine breaks down.
     * @param {number} time the time in milliseconds
     */
    set repairTime(time: number) {
        if (time < 0) {
            this._repairTime = 0;
        } else {
            this._repairTime = time;
        }
    }


    /**
     * Getter for the current time left until wind turbine is repaired.
     * @returns {number} the time in milliseconds
     */
    get repairTime(): number {
        return this._repairTime;
    }
    

    /**
     * Getter for owners uuid.
     * @returns {string} the owerns uuid
     */
    get owner(): string {
        return this._owner;
    }

    
    /**
     * Getter for the wind turbine data.
     * @returns {WindTurbineData} the wind turbine data object
     */
    get data(): WindTurbineData {
        return {
            owner: this.owner,
            current_power: this.currentPower,
            max_power: this.maxPower,
            production_ratio: this.productionRatio,
            break_down_freq: this.breakDownFreq,
            repair_time: this.repairTime,
            broken: this.broken,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }
}


/**
 * The wind turbine data schema.
 */
interface WindTurbineData {
    readonly owner: string;
    readonly current_power?: number;
    readonly max_power: number;
    readonly production_ratio: number;
    readonly break_down_freq: number;
    readonly repair_time?: number;
    readonly broken?: boolean;
    readonly created_at?: Date;
    readonly updated_at?: Date;
}
