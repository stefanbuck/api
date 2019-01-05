const redis = require('redis');
const log = require('./log');

let client;
const simpleCache = new Map();

module.exports = {
  auth: () => {
    log('Cache auth');

    return new Promise((resolve) => {
      if (client && client.connected) {
        log('Cache re-use redis instance');
        return resolve();
      }

      client = redis.createClient({
        port: 17604,
        // "AWS_DEFAULT_REGION": "eu-central-1",
        // "AWS_REGION": "eu-central-1",
        // NOW_REGION": "bru1",
        host: 'redis-17604.c135.eu-central-1-1.ec2.cloud.redislabs.com',
        password: process.env.REDIS_PWD,
        // retry_strategy: () => undefined, // Disable reconnecting
      });

      client.on('end', () => {
        log('Cache event: end');
      });

      client.on('connect', () => {
        log('Cache event: connect');
      });

      client.on('error', async (error) => {
        log('Cache error', error);
        if (client) {
          log('Cache connected / ready', client.connected, client.ready);
          client.end(true);
          client = null;
        }
        resolve();
      });

      client.on('ready', () => {
        log('Cache ready');
        resolve();
      });
    });
  },
  getRedisStatus: () => {
    if (!client) {
      return {
        redisNoClient: true,
        redisConnected: false,
        redisReady: false,
      };
    }

    const { connected, ready } = client;
    return {
      redisNoClient: false,
      redisConnected: connected,
      redisReady: ready,
    };
  },
  simpleCacheSize: () => simpleCache.size,
  set: (key, value) => new Promise((resolve) => {
    if (!client || !client.ready) {
      log('Cache SET simple-cache', key);
      simpleCache.set(key, value);
      return resolve();
    }

    log('Cache SET redis-cache', key);
    client.set(key, value, 'EX', 3600 * 4, (error) => {
      if (error) log('Cache SET error', error);
      resolve();
    });
  }),
  get: key => new Promise((resolve) => {
    if (!client || !client.ready) {
      log('Cache GET simple-cache', key, simpleCache.get(key));
      return resolve(simpleCache.get(key));
    }

    client.get(key, (error, value) => {
      if (error) {
        log('Cache GET redis-cache error', error);
        return resolve();
      }

      log('Cache GET redis-cache', key, value);
      // For later if Redis connections are rare
      // Do not forget to take TTL into account
      // if (value && !simpleCache.has(key)) {
      //   simpleCache.set(key, value);
      // }

      resolve(value);
    });
  }),
};
