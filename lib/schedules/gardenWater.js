/**
 * Import external libraries
 */
const debug = require('debug')('Water:Schedules');

async function _needsWatering() {
  debug(`Checking water levels`);

  try {
    const results = await this._needsWater.call(this, null, null, null);
    if (results instanceof Error) {
      this.logger.error(`${this._traceStack()} - ${results.message}`);
      return;
    }

    if (results.length === 0) {
      this.logger.info('Nothing needs watering');
      return;
    } // Exit function as no data to process

    this.logger.info('Garden needs watering');

    debug(`Checking if it will rain`);
    const willItRain = await this._callAlfredServiceGet.call(
      this,
      `${process.env.ALFRED_WEATHER_SERVICE}/willitrain?forcastDuration=5`,
    );

    if (!(willItRain instanceof Error)) {
      if (
        willItRain.precipProbability > 0.5 &&
        willItRain.precipIntensity > 0.5
      ) {
        this.logger.info(
          'Chance of rain is high, so will not activate water system',
        );
        return;
      }
    }

    this.logger.info("It's not going to rain so activate watering system");

    debug(`Send notification`);
    this._sendPushNotification.call(this, 'Garden needs 💦');

    // Connect to Link-tap controller
    const url = 'https://www.link-tap.com/api/activateInstantMode';
    const LinkTapUser = await this._getVaultSecret.call(this, 'LinkTapUser');
    const LinkTapKey = await this._getVaultSecret.call(this, 'LinkTapKey');
    const LinkTapGatewayID = await this._getVaultSecret.call(
      this,
      'LinkTapGatewayID',
    );
    const LinkTapID = await this._getVaultSecret.call(this, 'LinkTapID');

    const body = {
      username: LinkTapUser,
      apiKey: LinkTapKey,
      gatewayId: LinkTapGatewayID,
      taplinkerId: LinkTapID,
      action: true,
      duration: 3,
    };

    const returnData = await this._callAPIServicePost.call(this, url, body);

    if (returnData instanceof Error) {
      this.logger.error(
        `${this._traceStack()} - ${returnData.response.data.message}`,
      );
      return;
    }

    debug(`Turning on watering system`);
    this._sendPushNotification.call(this, 'Started to 💦 garden');
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
}

/**
 * Set up garden watering
 */
async function setupSchedules() {
  try {
    // Clear current schedules array
    debug(`Clear current schedules`);
    this.schedules = [];

    // Morning water check
    this.schedules.push({
      hour: 7,
      minute: 30,
      description: 'Morning watering check',
      functionToCall: _needsWatering,
    });

    // Evening water check
    this.schedules.push({
      hour: 19,
      minute: 0,
      description: 'Evening watering check',
      functionToCall: _needsWatering,
    });

    // Activate schedules
    await this.activateSchedules();
  } catch (err) {
    this.logger.error(`${this._traceStack()} - ${err.message}`);
  }
  return true;
}

module.exports = {
  setupSchedules,
};
