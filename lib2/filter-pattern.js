var pi = require('pipe-iterators'),
    isAbsolute = require('./is-absolute');

module.exports = function(opts) {
  return pi.filter(function(filepath) {
    return sync(opts, filepath);
  });
};

module.exports.sync = sync;

function sync(opts, filepath) {
  var pattern = opts.pattern,
      abspath = opts.abspath,
      cwd = opts.cwd,
      match = opts.match;

  if (filepath === '') {
    return false;
  }
  var isMatch = match(filepath, pattern);

  if (!isMatch) {
    // needed so that wildmatch treats dirs correctly (in some cases)
    if (filepath.charAt(filepath.length - 1) != '/') {
      isMatch = match(filepath + '/', pattern);
    }
  }

  // console.log('_filter', filepath, pattern, isMatch);
  if (isMatch) {
    // apply abspath
    if (abspath && !isAbsolute(filepath)) {
      filepath = path.resolve(cwd, filepath);
    }
  }
  return isMatch;
}
