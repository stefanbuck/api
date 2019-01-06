const { json } = require('micro');
const pMap = require('p-map');
const uniqWith = require('lodash.uniqwith');
const isEqual = require('lodash.isequal');

const registries = require('./src/registries');
const go = require('./src/go');
const java = require('./src/java');
const ping = require('./src/ping');

const tracking = require('./src/utils/tracking');
const cache = require('./src//utils/cache');
const log = require('./src/utils/log');

const logPrefix = log.prefix;

const supportedTypes = ['ping', 'go', 'java', ...registries.supported];

const mapper = async (item) => {
  let result;

  if (registries.supported.includes(item.type)) {
    result = await registries.resolve(item.type, item.target);
  } else if (item.type === 'go') {
    result = await go(item.target);
  } else if (item.type === 'java') {
    result = await java(item.target);
  } else if (item.type === 'ping') {
    result = await ping(item.target);
  } else {
    return;
  }

  return {
    ...item,
    result,
  };
};

function cleanPayload(payload) {
  // Remove duplicates
  // Remove invalid items which does not follow format {type:'foo', target: 'bar'}
  // Filter out types which are not supported
  return uniqWith(payload, isEqual).filter(
    item => item
      && item.target
      && item.target.length
      && supportedTypes.includes(item.type),
  );
}

async function requestHandler(payload) {
  return pMap(payload, mapper, { concurrency: 5 });
}

function errorHandler(error, res) {
  log(error);
  res.statusCode = 500;
  res.end('Internal server error');
}

tracking.init();

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const timingTotalStart = Date.now();

    const body = await json(req);

    const timingAuthStart = Date.now();
    await cache.auth();
    const timingAuthEnd = Date.now();

    let result;
    let timingTotalEnd;
    let completed = false;
    const payload = cleanPayload(body);

    try {
      result = await requestHandler(payload);
      completed = true;
    } catch (error) {
      return errorHandler(error, res);
    } finally {
      timingTotalEnd = Date.now();

      log('Redis Status', cache.getRedisStatus());
      log('SimpleCache size', cache.simpleCacheSize());
      log('Timing Total', timingTotalEnd - timingTotalStart);
      log('Timing Auth', timingAuthEnd - timingAuthStart);

      const meta = {
        event: '0meta',
        properties: {
          completed,
          instanceName: logPrefix,
          ...cache.getRedisStatus(),
          simpleCacheSize: cache.simpleCacheSize(),
          exectuionTime: timingTotalEnd - timingTotalStart,
        },
      };

      const bulkData = [
        meta,
        ...result.map(item => ({
          event: '0packages',
          properties: item,
        })),
      ];

      console.time('Mixpanel');
      await tracking.track(bulkData);
      console.timeEnd('Mixpanel');
    }

    res.end(
      JSON.stringify({
        result,
        meta: {
          ...cache.getRedisStatus(),
          simpleCacheSize: cache.simpleCacheSize(),
          instance: logPrefix,
          timingTotal: timingTotalEnd - timingTotalStart,
          timingAuth: timingAuthEnd - timingAuthStart,
        },
      }),
    );
  } else {
    res.end('OctoResolver');
  }
};
