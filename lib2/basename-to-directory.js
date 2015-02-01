var pi = require('pipe-iterators');

module.exports = function(opts) {

  return pi.map(function(prefix) {
    var read,
        strip = '',
        affix = '';
    // now that the prefix has been parsed, determine where we should start and
    // how we should normalize the paths when attempting to match against the current pattern

    // can be one of:
    // 1) the prefix is empty (pattern does not start with a string or a brace expression)
    if (prefix === '') {
      // pattern *starts* with some non-trivial item.
      // the only way to glob the root is to glob an absolute path expression, so use cwd
      // e.g. `*` => empty prefix => `./`
      read = opts.cwd;
      strip = opts.cwd;
    } else {
      // 2) the prefix is a path (cannot be empty)
      if (isAbsolute(prefix)) {
        // 2a) exprs with absolute paths are mounted at this.root and have no prefix to remove
        read = path.join(opts.root, prefix);
      } else {
        // 2b) exprs with relative paths are resolved against this.cwd
        // but have cwd removed when matching
        read = path.resolve(opts.cwd, prefix);
        strip = opts.cwd;
        // affix the prefix for relative matches, e.g.
        // ./**/* => full path => remove cwd => restore "./" => match
        // TODO: investigate more prefixes
        if (prefix.substr(0, 2) === './') {
          affix = './';
        }
      }
    }

    return {
      path: read,
      strip: strip,
      affix: affix,
      knownToExist: false
    };
  });
});
