var fs = require('fs'),
    path = require('path'),
    wildmatch = require('wildmatch'),
    microee = require('microee'),
    parse = require('glob-parse'),
    expand = require('mm-brace-expand');

// Totally based on the node-glob approach, though not using the exact same code.
//
// PROCESS(pattern)
// Get the first [n] items from pattern that are all strings
// Join these together.  This is PREFIX.
//   If there is no more remaining, then stat(PREFIX) and
//   add to matches if it succeeds.  END.
// readdir(PREFIX) as ENTRIES
//   If fails, END
//   If pattern[n] is GLOBSTAR
//     // handle the case where the globstar match is empty
//     // by pruning it out, and testing the resulting pattern
//     PROCESS(pattern[0..n] + pattern[n+1 .. $])
//     // handle other cases.
//     for ENTRY in ENTRIES (not dotfiles)
//       // attach globstar + tail onto the entry
//       PROCESS(pattern[0..n] + ENTRY + pattern[n .. $])
//
//   else // not globstar
//     for ENTRY in ENTRIES (not dotfiles, unless pattern[n] is dot)
//       Test ENTRY against pattern[n]
//       If fails, continue
//       If passes, PROCESS(pattern[0..n] + item + pattern[n+1 .. $])
//

module.exports = glob;

function glob(pattern, opts, onDone) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  if (!opts) {
    opts = {};
  }
  var g = new Glob(pattern, opts, onDone);
  return g.sync ? g.found : g;
}

function Glob(pattern, opts, onDone) {
  var self = this;
  this.sync = true;
  this.nomount = false;
  this.cwd = opts.cwd || process.cwd();
  this.root = path.resolve(this.cwd, '/');
  this.root = path.resolve(this.root);
  if (process.platform === 'win32') {
    this.root = this.root.replace(/\\/g, '/');
  }

  // set up the wildmatch filter, which simply checks the emitted files against
  // the pattern
  this.found = [];

  this.pattern = this._normalize(pattern);
  console.log('pattern', pattern, this.pattern);
  this._process(pattern);
}

microee.mixin(Glob);

Glob.prototype._filter = function(filepath) {
  var isMatch = wildmatch(filepath, this.pattern, { pathname: true });
  // console.log('_filter', filepath, this.pattern, wildmatch(filepath, this.pattern, { pathname: true }));
  totalFilterCalls++;
  if (isMatch) {
    this.found.push(filepath);
  }
  return isMatch;
};

function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

Glob.prototype._normalize = function(glob) {
  var self = this;
  var parsed = parse(glob, { full: true });
  return parsed.parts.map(function(part, i) {
    if (parsed.types[i] === 'brace') {
      // console.log(part.substring(1, part.length - 1));

      return '{' + self._normalize(part.substring(1, part.length - 1) ) + '}';
    }
    if (parsed.types[i] !== 'str') {
      return part;
    }
    // console.log('np', part);
    // preserve the leading and trailing slashes
    var isOnlySlash = /^\/\/+$/.test(part),
        leadingSlash = (part[0] === '/'),
        trailingSlash = (part[part.length - 1] === '/' && part.length > 2 && !isOnlySlash);
    return (leadingSlash ? '/' : '') +
      normalizeArray(part.split(/[\\\/]+/).filter(function(p) {
        return !!p;
      }), !isAbsolute(part)).join('/') +
      (trailingSlash ? '/' : '');
  }).join('');
};

// this is like glob-parse.basename() but also performs brace expansion
Glob.prototype._basenames = function(glob) {
  var result;

  function getPrefix(glob) {
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

    console.log('result', prefix, result);
    return result;
  }

  result = getPrefix(glob);

  console.log('final', result);

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
};

Glob.prototype._process = function(pattern) {
  var self = this,
      prefix = '',
      i = 0;

  var basenames = this._basenames(pattern);

  console.log(basenames);

  basenames.forEach(function(prefix) {
    // see if there's anything else
    var read;
    var strip = '';
    // is the only way to glob the root is to glob an absolute path expression ???
    // e.g. `*` => empty prefix => `./`


    // can be one of:
    // 1) the prefix is empty (pattern does not start with a string or a brace expression)
    if (prefix === '') {
      // pattern *starts* with some non-trivial item.
      read = self.cwd;
      strip = self.cwd;
    } else {
      // 2) the prefix is a path

      // pattern has some string bits in the front.
      // whatever it starts with, whether that's "absolute" like /foo/bar,
      // or "relative" like "../baz"
      read = prefix;

      if (isAbsolute(prefix)) {
        // 2a) absolute path
        if (!prefix) {
          prefix = "/";
        }
        // absolute paths are mounted at this.root
        read = path.join(self.root, prefix);
      } else {
        // 2b) relative path
        // relative paths are resolved against this.cwd
        read = path.resolve(self.cwd, prefix);
        strip = self.cwd;
      }
    }
    // now read the directory and all subdirectories:
    // if wildmatch supported partial matches we could prune the tree much earlier

    console.log('dostat', prefix, 'read', read, 'remove', strip);

    self._doStat(read, strip, false);
  });
};

Glob.prototype._doStat = function(read, strip, knownToExist) {
  var self = this;

  function absToRel(str) {
    if (strip.length === 0) {
      return str;
    }

    return (str.substr(0, strip.length) == strip ? str.substr(strip.length + 1) : str);
  }

  function resolveDir(dirname) {
    // if the input is a directory, add all files in it, but do not add further directories
    var basepath = (dirname[dirname.length - 1] !== path.sep ? dirname + path.sep : dirname);
    self._readdir(basepath, function(err, entries) {
      entries.forEach(function(f) {
        if (f.charAt(0) === '.') {
          return;
        }
        self._doStat(basepath + f, strip, true);
      });
    });
  }

  this._stat(read, knownToExist, function(exists, isDir) {
    // console.log('resolve', filepath, exists, isDir);
    // this where partial matches against a pending traversal would help by pruning the tree
    if (isDir) {
      resolveDir(read);
      // try without a trailing slash
      if (!self._filter(absToRel(read))) {
        // needed so that wildmatch treats dirs correctly (in some cases)
        if (read.charAt(read.length - 1) != '/') {
          self._filter(absToRel(read + '/'));
        }
      }
    } else if (exists) {
      self._filter(absToRel(read));
    };
  });
};

Glob.prototype._stat = function(p, knownToExist, onDone) {
  var stat;
  try {
    stat = fs.statSync(p);
  } catch (e) {
    switch(e.code) {
      case 'ELOOP':
        // like Minimatch, ignore ELOOP for purposes of existence check but not
        // for the actual stat()ing
        return onDone(knownToExist, false);
        break;
      default:
        console.error(e);
        console.error(e.stack);
      case 'ENOENT':
        // ignore ENOENT (per Node core docs, "fs.exists() is an anachronism
        // and exists only for historical reasons. In particular, checking if a file
        // exists before opening it is an anti-pattern")
        return onDone(false, false);
    }
  }
  return onDone(!!stat, stat.isDirectory());
};

Glob.prototype._readdir = function(p, onDone) {
  var entries;
  try {
    entries = fs.readdirSync(p);
  } catch (e) {
    switch(e.code) {
      case 'ENOTDIR':
      case 'ENOENT':
      case 'ELOOP':
      case 'ENAMETOOLONG':
      case 'UNKNOWN':
        return onDone(e, []);
      default:
        this.emit('error', e);
        console.error(e);
        console.error(e.stack);
        return onDone(e, []);
    }
  }
  return onDone(null, entries);
};

var isAbsolute = process.platform === "win32" ? absWin : absUnix

function absWin (p) {
  if (absUnix(p)) return true
  // pull off the device/UNC bit from a windows path.
  // from node's lib/path.js
  var splitDeviceRe =
      /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/
    , result = splitDeviceRe.exec(p)
    , device = result[1] || ''
    , isUnc = device && device.charAt(1) !== ':'
    , isAbsolute = !!result[2] || isUnc // UNC paths are always absolute

  return isAbsolute
}

function absUnix (p) {
  return p.charAt(0) === "/" || p === ""
}
