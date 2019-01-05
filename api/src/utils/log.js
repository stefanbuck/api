const name = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, '')
  .substr(0, 8);

function log(...rest) {
  console.log.apply(this, [`>> ${name}:`, ...rest]);
}

log.prefix = name;

module.exports = log;
