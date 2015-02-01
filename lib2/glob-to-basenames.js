var pi = require('pipe-iterators'),
    parse = require('glob-parse'),
    expand = require('mm-brace-expand');

module.exports = function() {

  return pi.forEach(function(glob) {
    var result;

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

    result = getPrefix(glob);

    // always make the base path end with a /
    // this avoids issues with expressions such as `js/t[a-z]` or `js/foo.js`
    result = result.map(function(str) {
      var lastSlash = str.lastIndexOf('/', str.length);
      if (lastSlash !== str.length - 1) {
        return str.substring(0, lastSlash + 1);
      }
      return str;
    });

    return result;
  });
};
