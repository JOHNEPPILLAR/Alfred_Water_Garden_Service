/**
 * Import external libraries
 */
const { Service } = require('alfred-base');
const debug = require('debug')('Water:Server');

// Setup service options
const { version } = require('../../package.json');
const serviceName = require('../../package.json').description;
const namespace = require('../../package.json').name;

const options = {
  serviceName,
  namespace,
  serviceVersion: version,
};

// Bind api functions to base class
Object.assign(Service.prototype, require('../api/sensors/sensors'));

// Bind schedule functions to base class
Object.assign(Service.prototype, require('../schedules/gardenWater'));

// Create base service
const service = new Service(options);

async function setupServer() {
  // Setup service
  await service.createRestifyServer();

  // Apply api routes
  service.restifyServer.get('/sensors/:gardenSensorAddress', (req, res, next) =>
    service._sensors(req, res, next),
  );
  debug(`Added get '/sensors/:gardenSensorAddress' api`);

  service.restifyServer.get('/sensors/current', (req, res, next) =>
    service._current(req, res, next),
  );
  debug(`Added get '/sensors/current' api`);

  service.restifyServer.get('/needswater', (req, res, next) =>
    service._needsWater(req, res, next),
  );
  debug(`Added '/needsWater' api`);

  await service.setupSchedules();

  // Listen for api requests
  service.listen();
}
setupServer();
