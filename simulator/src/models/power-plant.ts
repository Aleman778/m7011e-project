
/***************************************************************************
 * The power-plant model holds the neccessary parameters and power-plant data.
 ***************************************************************************/


import Simulation from "../simulation";
import Battery from "./battery";
import Market from "./market";
import uuid from "uuid";
import { ElectricityGridDB, eq } from "../database";
import { randomFloat, randomInt }  from "./utils";


/**
 * The power-plant model holds the parametes and model used to generate electricity.
 * Different power-plant models can be used to simulate different power-plants.
 */
export default class PowerPlant {
    /**
     * The uuid of the power plant owner.
     */
    private _owner: string;
    
    /**
     * The name of the power plant.
     */
    private _name: string;
    
    /**
     * The status of the power plant.
     */
    private state: State;

    /**
     * The time it takes for the power plant to change its current state.
     */
    private delay: number;
    
    /**
     * The number of kWh that should be produced by the power-plant. 
     */
    private _productionLevel: number;
    
    /**
     * The number of kWh that the power plant max can produce.
     */
    private productionCapacity: number;

    /**
     * The number of kWh that can differ from the productionLevel.
     */
    private productionVariant: number;

    /**
     * The ratio of produced eletricity to send to the market.
     */
    private _marketRatio: number;

    /**
     * The current market price.
     */
    private marketPrice?: number;

    /**
     * The market for selling/ buying electricity to/ from local producers.
     */
    public market: Market;
    
    /**
     * The power plants battery.
     */
    public battery: Battery;

    /**
     * The unit.
     */
    private unit: string;
    
    /**
     * The timestamp when this power plant object was created.
     */
    private createdAt: Date;

    /**
     * The timestamp when the power plant simulation was last updated.
     */
    private updatedAt: Date;

    /**
     * The current production.
     */
    private production: number;

    
    /**
     * Creates a new power plant instance with the given parameters.
     * @param {PowerPlantData} data the power plant parameters
     */
    constructor(data: PowerPlantData) {
        let sim = Simulation.getInstance();
        this._owner = data.owner;
        this._name = data.name;
        this.delay = +(data.delay || 0);
        this.state = data.state || State.Stopped;
        this._marketRatio = data.market_ratio;
        this._productionLevel = +data.production_level;
        this.productionCapacity = +data.production_capacity;
        this.productionVariant = +data.production_variant;
        this.market = new Market();
        this.marketPrice = +(data.market_price || 0);
        this.unit = data.unit || "kWh";
        this.createdAt = data.created_at || sim.time;
        this.updatedAt = data.updated_at || sim.time;
        this.production = 0;
        this.battery = new Battery(data.owner,
                                   +data.battery_capacity);
            if (data.battery_value != undefined) {
                this.battery.value = +data.battery_value;
            }
    }


    /**
     * Generate prameters for the power plant simulation.
     * @returns {PowerPlant} a new power plant object
     */
    static generate(owner: string, name: string): PowerPlant {
        return new PowerPlant({
            owner: owner,
            name: name,
            production_level: randomFloat(100/3600, 200/3600),
            production_capacity: randomFloat(200/3600, 400/3600),
            production_variant: randomFloat(2/3600, 10/3600),
            battery_capacity: randomFloat(1000/3600, 5000/3600),
            market_ratio: 0.5,
        });
    }


    /**
     * Tries to find a power plant object in the database with the given owner id.
     * @returns {Promise<PowerPlant>} the power plant object is found
     */
    static async findByOwner(owner: string): Promise<PowerPlant> {
        let rows = await ElectricityGridDB.table('Power_plant')
            .select<PowerPlantData>([], [eq('owner', owner)]);
        if (rows.length == 1) {
            return new PowerPlant(rows[0]);
        } else {
            return Promise.reject("Could not find any power plant object with id " + owner);
        }
    }


    /**
     * Starts the power plant.
     * @note Takes some time before its starts.
     * @note The power plant can only start if its State is equal Stopped.
     */
    start() {
        if (this.state == State.Stopped) {
            this.state = State.Starting;
            this.delay = randomInt(10000, 30000);
        }
    }


    /**
     * Stops the power plant.
     * @note Takes some time before its stops.
     * @note The power plant can only stop if its State is equal to Running.
     */
    stop() {
        if (this.state == State.Running) {
            this.state = State.Stopping;
            this.delay = randomInt(10000, 30000);
        } 
    }


    /**
     * Update the power plant data in the database.
     * @param {Simulation} sim the simulation instance.
     */
    async store(sim: Simulation) {
        let time = sim.time;

        await storePowerPlantData({
            owner: this.owner,
            time: time,
            production: this.market.power,
            battery_value: this.battery.value,
            unit: this.unit
        });
        
        this.updatedAt = sim.time;
        await ElectricityGridDB.table('power_plant').insert_or_update(this.data, ['owner']);
    }


    /**
     * Updates the marketProduction and battery value.
     * This method should be called each simulation step to ensure that
     * the power plant state is up to date.
     * @param {Simulation} sim the simulation instance.
     * @param {number} demand the number of kWh consumed and not covered by wind power since last step.
     */
    update(sim: Simulation) {
        if (this.state == State.Running) {
            this.production = Math.max(0, this.simProduction(sim.time));
            let sendToMarket = this.production * this.marketRatio;
            this.market.sell(sendToMarket);
            this.battery.value += this.production - sendToMarket;
        } else if (this.state == State.Starting ||
                   this.state == State.Stopping){
            this.production = 0;
            this.delay -= sim.deltaTime;
            if (this.delay <= 0){
                this.delay = 0;
                if (this.state == State.Starting) {
                    this.state = State.Running;
                } else {
                    this.state = State.Stopped;
                }
            }
        } else {
            this.production = 0;
        }
    }


    /**
     * Gets all of the power plants historical data.
     * @returns {Promise<PowerPlantData[]} the power plants historical data.
     */
    async getHistoricalPowerPlantData(): Promise<PowerPlantData[]> {
        try {
            let rows = await ElectricityGridDB.table('power_plant_data').select([], [eq('owner', this.owner)]);
            if (rows.length == 0) {
                return Promise.reject("No data found in db for power plant with id: " + this.owner);
            } else {
                return rows;
            }
        } catch(err) {
            console.trace(err);
            return err;
        }
    }


    /**
     * Buy electricity from the power plants battery.
     * @param {number} demand the power needed.
     * @returns {number} the remaining if battery is empty
     */
    buy(demand: number): number {
        if (this.state != State.Running) {
            if (this.battery.value > demand) {
                this.battery.value -= demand;
                return 0;
            } else {
                let remaining = demand - this.battery.value;
                this.battery.value = 0;
                return remaining;
            }
        }
        return demand;
    }


    /**
     * Simulates the amount of electricity produced.
     * @param {Date} time the current time
     * @returns {number} the simulated electricity production value.
     */
    private simProduction(time: Date): number {
        return this._productionLevel + Math.sin(time.getTime()) * this.productionVariant;
    }
    
    
    /**
     * Gets all the current power plant information.
     * @returns {PowerPlantData} the current power plant information. 
     */
    get data(): PowerPlantData {
        return {
            owner: this.owner,
            name: this.name,
            state: this.state,
            delay: this.delay,
            production_level: this.productionLevel,
            production_capacity: this.productionCapacity,
            production_variant: this.productionVariant,
            market_ratio: this.marketRatio,
            market_price: this.marketPrice,
            battery_value: this.battery.value,
            battery_capacity: this.battery.capacity,
            unit: this.unit,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }

    
    /**
     * Setter for the productionLevel variable.
     * NOTE: Can't be lower then zero or higher the productionCapacity variable.
     * @param {number} productionLevel the production level to set
     */
    set productionLevel(productionLevel: number) {
        if (productionLevel >= 0 && productionLevel <= this.productionCapacity) {
            this._productionLevel = +productionLevel;
        }        
    }

    
    /**
     * Setter for the marketRatio variable.
     * @note Can't be lower the zero or higher then one
     * @param {number} marketRatio the market ratio to set
     */
    set marketRatio(marketRatio: number) {
        if (marketRatio >= 0 && marketRatio <= 1) {
            this._marketRatio = marketRatio;
        }
    }


    /**
     * Getter for the production level.
     * @returns {number} the production level
     */
    get productionLevel(): number {
        return this._productionLevel;
    }


    /**
     * Getter for the market ratio.
     * @returns {number} the market ratio
     */
    get marketRatio(): number {
        return this._marketRatio;
    }
    

    /**
     * Getter the owner of the power plant.
     * @returns {string} the owner of the power plant.
     */
    get owner(): string {
        return this._owner;
    }


    /**
     * Getter the name of the power plant.
     * @returns {string} the name of the power plant.
     */
    get name(): string {
        return this._name;
    }    
}


/**
 * The different states that the power plant can be in.
 */
enum State {
    Stopped = "Stopped",
    Running = "Running",
    Starting = "Starting",
    Stopping = "Stopping",
}


/**
 * PowerPlantData holds the powerplants parameters.
 */
export interface PowerPlantData {
    readonly owner: string;
    readonly name: string;
    readonly state?: State;
    readonly delay?: number;
    readonly production_level: number;
    readonly production_capacity: number;
    readonly production_variant: number;
    readonly market_ratio: number;
    readonly market_price?: number;
    readonly battery_value?: number;
    readonly battery_capacity: number;
    readonly unit?: string;
    readonly created_at?: Date;
    readonly updated_at?: Date;
}


/**
 * PowerPlantStatus is a data structure for holding power plant status.
 */
export interface PowerPlantStatus {
    readonly owner: string;
    readonly time: Date;
    readonly production: number;
    readonly battery_value: number;
    readonly unit: string;
}


/**
 * Store a given power plant data in the power_plant_data table.
 * If there already exists data for this time then update instead.
 */
async function storePowerPlantData(data: PowerPlantStatus) {
    try {
        await ElectricityGridDB.table('power_plant_data').insert_or_update(data, ['owner', 'time']);
    } catch (err) {
        console.log("[Power Plant] Failed to store power plant data");
    }
}
