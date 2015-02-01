var path = require('path');

// utils
function nop() {}
function runTaskImmediately(task) { task(nop); }
function absToRel(str, strip) {
  if (strip.length === 0) {
    return str;
  }

  return (str.substr(0, strip.length) == strip ? str.substr(strip.length + 1) : str);
}

// implementation
function traverse(filepath, strip, affix, knownToExist, stat, readdir, exec, doStat, filter, onError, onDone) {

}

module.exports = traverse;
