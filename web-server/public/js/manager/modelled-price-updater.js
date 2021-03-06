/******************************************************************************
 * Updates modelled price data field.
 ******************************************************************************/


let modelledPriceInterval;


/**
 * Starts a interval that updates the modelled price data field.
 * Note: Call this when page is loaded.
 */
function loadModelledPriceData() {
    unloadModelledPriceData();
    modelledPriceInterval = setInterval(updateModelledPriceDataField, 100);
}


/**
 * Clears the interval that updates the modelled price data field.
 * Note: Call this when page is unloaded.
 */
function unloadModelledPriceData() {
    if (modelledPriceInterval != undefined) {
        clearInterval(modelledPriceInterval);
        modelledPriceInterval = undefined;
    }
}


/**
 * Updates the modelled price data field.
 */
async function updateModelledPriceDataField() {
    try {
        const response = await fetch('/manager/market/suggested-price', {
            method: 'POST'
        });
        const modelledPrice = await response.json();
        $("#modelledPrice span").html(modelledPrice.toFixed(3) + " öre/kWh");
    } catch(error) {
        console.error(error);
        unloadModelledPriceData();
        /**
         * @TODO Add a alert.
         */
    }
}
