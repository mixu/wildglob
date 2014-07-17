var fs = require('fs'),
    path = require('path'),
    wildmatch = require('wildmatch'),
    microee = require('microee'),
    parse = require('glob-parse'),
    expand = require('mm-brace-expand'),
    parallel = require('miniq');

function nop() {}
function runTaskImmediately(task) { task(nop); }

module.exports = glob;

function glob(pattern, opts, onDone) {
  var g = new Glob(pattern, opts);
  if (typeof opts === 'function') {
    onDone = opts;
  }

  g.queue.once('error', function() {
    onDone(err);
  });
  g.queue.once('empty', function() {
    onDone(null, g.found);
  });

  // run asynchronously
  g.queue.exec(g._tasks(pattern));

  return g;
};

glob.sync = function(pattern, opts) {
  opts = opts || {};
  opts.sync = true;
  var g = new Glob(pattern, opts);

  // run synchronously
  g._tasks(pattern).forEach(runTaskImmediately);

  return g.found;
};

function Glob(pattern, opts) {
  if (typeof opts === 'function') {
    opts = {};
  }
  opts = opts || {};

  this.sync = opts.sync;
  this.cwd = opts.cwd || process.cwd();
  this.root = path.resolve(this.cwd, '/');
  this.root = path.resolve(this.root);
  if (process.platform === 'win32') {
    this.root = this.root.replace(/\\/g, '/');
  }

  this.fs = opts.fs || fs;
  // Setting parallellism to infinity really helps in clearing out the async queue
  this.queue = parallel(Infinity);
  // Never need to break the queue, as all tasks are truely async
  this.queue.maxStack = Infinity;
  this.found = [];

  this.pattern = this._normalize(pattern);
}

microee.mixin(Glob);

var minimatch = require('minimatch');
// var globy = require('globy');

Glob.prototype._filter = function(filepath) {
  // var isMatch = wildmatch(filepath, this.pattern, { pathname: true });
  var isMatch = minimatch(filepath, this.pattern);
  // var isMatch = true;
  // var isMatch = globy.fnmatch(this.pattern, filepath);

  // console.log('_filter', filepath, this.pattern, wildmatch(filepath, this.pattern, { pathname: true }));
  if (isMatch) {
    this.found.push(filepath);
  }
  return isMatch;
};

// via Node core path.js
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

Glob.prototype._tasks = function(pattern) {
  var self = this,
      prefix = '',
      i = 0;

  var basenames = this._basenames(pattern);

  return basenames.map(function(prefix) {
    return function(done) {
      var read,
          strip = '';
      // now that the prefix has been parsed, determine where we should start and
      // how we should normalize the paths when attempting to match against the current pattern

      // can be one of:
      // 1) the prefix is empty (pattern does not start with a string or a brace expression)
      if (prefix === '') {
        // pattern *starts* with some non-trivial item.
        // the only way to glob the root is to glob an absolute path expression, so use cwd
        // e.g. `*` => empty prefix => `./`
        read = self.cwd;
        strip = self.cwd;
      } else {
        // 2) the prefix is a path (cannot be empty)
        if (isAbsolute(prefix)) {
          // 2a) exprs with absolute paths are mounted at this.root and have no prefix to remove
          read = path.join(self.root, prefix);
        } else {
          // 2b) exprs with relative paths are resolved against this.cwd
          // but have cwd removed when matching
          read = path.resolve(self.cwd, prefix);
          strip = self.cwd;
        }
      }
      // now read the directory and all subdirectories:
      // if wildmatch supported partial matches we could prune the tree much earlier
      // console.log('dostat', prefix, 'read', read, 'remove', strip);

      self._doStat(read, strip, false, done);
    };
  });
};

Glob.prototype._doStat = function(filepath, strip, knownToExist, onDone) {
  var self = this,
      exec = (self.sync ? runTaskImmediately : self.queue.exec.bind(self.queue));

  function absToRel(str) {
    if (strip.length === 0) {
      return str;
    }

    return (str.substr(0, strip.length) == strip ? str.substr(strip.length + 1) : str);
  }

  // the order between stat and filter does not matter, because we'll need to stat each
  // entry anyway to know if it's a dir, even if it fails the filter check (since the full path
  // can still match even if the current partial does not)
  // if we had accurate partial matching then yes, then filter before stat is slightly better.
  this._stat(filepath, function(err, stat) {
    var exists,
        isDir = false;
    if (err) {
      switch(e.code) {
        case 'ELOOP':
          // like Minimatch, ignore ELOOP for purposes of existence check but not
          // for the actual stat()ing
          exists = knownToExist;
          break;
        default:
          console.error(e);
          console.error(e.stack);
        case 'ENOENT':
          // ignore ENOENT (per Node core docs, "fs.exists() is an anachronism
          // and exists only for historical reasons. In particular, checking if a file
          // exists before opening it is an anti-pattern")
          exists = false;
      }
    } else {
      exists = true;
      isDir = stat.isDirectory();
    }

    // console.log('resolve', filepath, exists, isDir);
    // this where partial matches against a pending traversal would help by pruning the tree
    if (isDir) {
      // try without a trailing slash
      if (!self._filter(absToRel(filepath))) {
        // needed so that wildmatch treats dirs correctly (in some cases)
        if (filepath.charAt(filepath.length - 1) != '/') {
          self._filter(absToRel(filepath + '/'));
        }
      }
      // if the input is a directory, readdir and process all entries in it
      var basepath = (filepath[filepath.length - 1] !== path.sep ? filepath + path.sep : filepath);
      self._readdir(basepath, function(err, entries) {
        if (err) {
          switch(e.code) {
            case 'ENOTDIR':
            case 'ENOENT':
            case 'ELOOP':
            case 'ENAMETOOLONG':
            case 'UNKNOWN':
              break;
            default:
              self.emit('error', e);
              console.error(e);
              console.error(e.stack);
          }
          entries = [];
        }
        entries.forEach(function(f) {
          if (f.charAt(0) === '.') {
            return;
          }
          // queue a stat operation
          exec(function(done) { self._doStat(basepath + f, strip, true, done); });
        });
        // tasks have been queued so this entry is done
        onDone();
      });
    } else if (exists) {
      self._filter(absToRel(filepath));
      // no readdir, so the stat for this entry is done
      onDone();
    }
  });
};

Glob.prototype._stat = function(p, onDone) {
  var stat, err;
  if (this.sync) {
    try {
      stat = this.fs.statSync(p);
    } catch (e) {
      err = e;
    }
    onDone(err, stat);
  } else {
    this.fs.stat(p, onDone);
  }
};

Glob.prototype._readdir = function(p, onDone) {
  var self = this, entries, err;

  if (this.sync) {
    try {
      entries = this.fs.readdirSync(p);
    } catch (e) {
      err = e;
    }
    onDone(err, entries);
  } else {
    this.fs.readdir(p, onDone);
  }
};

var isAbsolute = process.platform === "win32" ? absWin : absUnix;

function absWin (p) {
  if (absUnix(p)) { return true; }
  // pull off the device/UNC bit from a windows path.
  // from node's lib/path.js
  var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/,
      result = splitDeviceRe.exec(p),
      device = result[1] || '',
      isUnc = device && device.charAt(1) !== ':',
      isAbsolute = !!result[2] || isUnc; // UNC paths are always absolute

  return isAbsolute
}

function absUnix (p) {
  return (p.charAt(0) === "/" || p === "");
}
