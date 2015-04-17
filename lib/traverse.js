var path = require('path');

// utils
function nop() {}
function runTaskImmediately(task) { task(nop); }

// implementation
function traverse(filepath, strip, affix, knownToExist, stat, readdir, exec, doStat, filter, onError, onDone) {

}

module.exports = traverse;
