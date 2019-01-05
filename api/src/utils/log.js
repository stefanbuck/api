const name = Math.random()
  .toString(36)
  .replace(/[^a-z]+/g, "")
  .substr(0, 8);

function log() {
  console.log.apply(this, [`>> ${name}:`, ...arguments]);
}

log.prefix = name;

module.exports = log;
