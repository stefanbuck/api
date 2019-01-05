const Mixpanel = require("mixpanel");

let instance;

module.exports = {
  init: () => {
    if (!process.env.MIXPANEL_TOKEN) {
      return;
    }

    instance = Mixpanel.init(process.env.MIXPANEL_TOKEN, {
      protocol: "https"
    });
  },

  track: (eventName, data) => {
    if (!instance) {
      return console.log("Track", eventName, data);
    }

    return new Promise((resolve, reject) => {
      instance.track(eventName, data, resolve);
    });
  }
};
