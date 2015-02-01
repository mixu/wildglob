var pi = require('pipe-iterators');

var isAbsolute = process.platform === 'win32' ? absWin : absUnix;

module.exports = function(opts) {
  var pattern = opts.pattern,
      abspath = opts.abspath,
      cwd = opts.cwd,
      match = opts.match;

  return pi.filter(function(filepath) {
    if (filepath === '') {
      return false;
    }
    var isMatch = match(filepath, pattern);

    // console.log('_filter', filepath, pattern, isMatch);
    if (isMatch) {
      // apply abspath
      if (abspath && !isAbsolute(filepath)) {
        filepath = path.resolve(cwd, filepath);
      }
    }
    return isMatch;
  };
};

function absWin (p) {
  if (absUnix(p)) { return true; }
  // pull off the device/UNC bit from a windows path.
  // from node's lib/path.js
  var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/,
      result = splitDeviceRe.exec(p),
      device = result[1] || '',
      isUnc = device && device.charAt(1) !== ':',
      isAbsolute = !!result[2] || isUnc; // UNC paths are always absolute

  return isAbsolute;
}

function absUnix (p) {
  return (p.charAt(0) === '/' || p === '');
}
