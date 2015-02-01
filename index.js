var path = require('path'),
    minimatch = require('minimatch'),
    microee = require('microee'),
    through2 = require('through2'),
    traverse = require('./lib/traverse'),
    libfs = require('./lib/fs');

function nop() {}
function runTaskImmediately(task) { task(nop); }

module.exports = glob;

function glob(pattern, opts, onDone) {
  var g = new Glob(pattern, opts, onDone);
  // run asynchronously
  // add delay to allow the caller to attach event handlers,
  // even if the resolution goes quickly
  setTimeout(function() {
    g.queue.exec(g._tasks(pattern));
  }, 15);
  return g;
};

glob.sync = function(pattern, opts) {
  opts = opts || {};
  opts.sync = true;
  var g = new Glob(pattern, opts);

  // run synchronously
  g._tasks(pattern).forEach(runTaskImmediately);
  g.on('error', function(err) {
    throw err;
  });

  return g.found;
};

glob.stream = function(pattern, opts) {
  var g = new Glob(pattern, opts),
      stream = through2.obj();

  g.on('error', stream.emit.bind(stream, 'error'));
  g.on('match', function(filepath) {
    stream.write(filepath);
  });
  g.once('end', function() {
    stream.end();
  });
  // add delay to allow the caller to attach event handlers,
  // even if the resolution goes quickly
  setTimeout(function() {
    g.queue.exec(g._tasks(pattern));
  }, 15);
  return stream;
};

function Glob(pattern, opts, onDone) {
  var self = this;
  if (typeof opts === 'function') {
    onDone = opts;
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

  // Setting parallellism to infinity really helps in clearing out the async queue
  this.queue = parallel(Infinity);
  // Never need to break the queue, as all tasks are truly async
  this.queue.maxStack = Infinity;
  this.found = [];
  this.pattern = pattern;
  // default matching function is minimatch
  this.match = opts.match || minimatch;
  this.abspath = opts.abspath || false;

  // attach listeners
  this.queue.once('empty', function() {
    self.emit('end');
  });
  var calledDone = false;
  if (typeof onDone === 'function') {
    this.once('error', function(err) {
      if (calledDone) {
        return;
      }
      calledDone = true;
      onDone(err);
    });
    this.queue.once('empty', function() {
      if (calledDone) {
        return;
      }
      calledDone = true;
      onDone(null, self.found);
    });
  }

  // attach traverse function
  if (this.sync) {
    opts.fs = libfs.sync(opts.fs || require('fs'));

    // filepath, strip, affix, knownToExist, stat, readdir, exec, onError, onDone
    this._doStat = function(filepath, strip, affix, knownToExist, onDone) {
      return traverse(filepath, strip, affix, knownToExist,
        opts.fs.stat,
        opts.fs.readdir,
        runTaskImmediately,
        self._doStat,
        self._filter.bind(self),
        function (err) { throw err; },
        onDone);
    };
  } else {
     opts.fs = libfs.async(opts.fs || require('fs'));
    this._doStat =
    function(filepath, strip, affix, knownToExist, onDone) {
      return traverse(filepath, strip, affix, knownToExist,
        opts.fs.stat,
        opts.fs.readdir,
        self.queue.exec.bind(self.queue),
        self._doStat,
        self._filter.bind(self),
        function(err) { console.log(err); self.emit('error', err); } , // self.emit.bind(self, 'error'),
        onDone);
    };
  }
}

microee.mixin(Glob);

Glob.prototype._filter = ;

// this is like glob-parse.basename() but also performs brace expansion
Glob.prototype._basenames = function(glob) {

};

Glob.prototype._tasks = function(pattern) {
  var self = this,
      prefix = '',
      i = 0;

  var basenames = this._basenames(pattern);

  // console.log(basenames);

  return
};

