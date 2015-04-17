var pi = require('pipe-iterators'),
    parse = require('glob-parse'),
    expand = require('mm-brace-expand');

// this is like glob-parse.basename() but also performs brace expansion
module.exports = function() {
  return pi.thru.obj(function(glob, enc, done) {
    sync(glob).forEach(function(basepath) {
      this.push(basepath);
    }, this);
    done();
  });
};

module.exports.sync = sync;

function sync(glob) {
  // always make the base path end with a /
  // this avoids issues with expressions such as `js/t[a-z]` or `js/foo.js`
  return getPrefix(glob).map(function(str) {
      var lastSlash = str.lastIndexOf('/', str.length);
      if (lastSlash !== str.length - 1) {
        return str.substring(0, lastSlash + 1);
      }
      return str;
    });
}

function getPrefix(glob) {
  if (!glob) {
    return [];
  }

  var parsed = parse(glob, { full: true }),
      result,
      prefix = '',
      hasBraces = false,
      expanded;

  // concatenate the values until the first item that is not a string and not a brace expansion
  for (i = 0; i < parsed.types.length; i++) {
    if (parsed.types[i] !== 'str' && parsed.types[i] !== 'brace') {
      break;
    }
    if (parsed.types[i] === 'brace') {
      hasBraces = true;
    }
    prefix += parsed.parts[i];
  }

  if (hasBraces) {
    // expand expression
    expanded = expand(prefix);
    // brace expressions may contain further tokens, e.g. {./*/*,/tmp/glob-test/*}
    result = Array.prototype.concat.apply([], expanded.map(function(expr) {
      return getPrefix(expr);
    }));
  } else {
    // plain str
    result = [ prefix ];
  }
  return result;
}
