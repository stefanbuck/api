const insight = require('../utils/insight.js');
const promiseLimit = require('promise-limit');
const countBy = require('lodash.countby');
const got = require('got');
const registryConfig = require('../../config.json');


const MAXIMUM_CONCURRENT_REQUESTS = 20;

function track(request) {
  const { payload } = request;

  const trackData = Object.assign({
    totalLength: payload.length,
  }, countBy(payload, 'type'));

  insight.trackEvent('bulk', trackData, request);
}

const register = (server) => {
  server.route([{
    path: '/bulk',
    method: 'POST',
    config: {
      handler: async (request) => {
        const { payload } = request;

        track(request);


        try { 

            const zeitPayload = payload
              .filter(({type}) => type === 'registry')
              .filter(({registry}) => Object.keys(registryConfig).includes(registry))
              .filter(({target}) => !!target)
              .filter(({target}) => !target.startsWith('@/'));
  
            const startTime = Date.now();

            got.post('https://octo-resolver.now.sh', {
              json: true,
              body: zeitPayload
            })
            .then((res) => {
              insight.trackEvent('zeitTraffic', {
                resolved: true,
                duration: (Date.now() - startTime),
                statusCode: res.statusCode,       
              }, request);
            })
            .catch((error) => {
              if (error && error.statusCode === 404) {
                insight.trackEvent('zeitTraffic', {
                  resolved: true,
                  duration: (Date.now() - startTime),    
                  statusCode: error.statusCode,   
                }, request);

              }else {
                console.log(error);
                insight.trackEvent('zeitTraffic', {
                  resolved: false,
                  duration: (Date.now() - startTime),
                  statusCode: error.statusCode,
                }, request);
              }
            })
        }catch(err) {}

        const limit = promiseLimit(MAXIMUM_CONCURRENT_REQUESTS);

        return Promise.all(payload.map((item) => {
          if (item.type === 'registry') {
            return limit(() => server.inject({
              method: 'get',
              url: `/q/${item.registry}/${item.target}`,
            }));
          } else if (item.type === 'ping') {
            return limit(() => server.inject({
              method: 'get',
              url: `/ping?url=${item.target}`,
            }));
          }
        }))
          .then(values => values.map((item) => {
            if (item && item.result && item.result.url) {
              return item.result.url;
            }

            return null;
          }));
      },
    },
  }]);
};

exports.plugin = {
  name: 'Bulk',
  version: '1.0.0',
  register,
};
