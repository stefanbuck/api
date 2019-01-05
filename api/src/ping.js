const got = require("got");

module.exports = function(url) {
  return got
    .head(url)
    .then(() => url)
    .catch(() => null);
};
