var path = require('path'),
    pi = require('pipe-iterators'),
    minimatch = require('minimatch'),
    globToBasenames = require('./glob-to-basenames'),
    basenameToDirectory = require('./basename-to-directory'),
    traverseDirectory = require('./traverse-directory'),
    filterPattern = require('./filter-pattern');

module.exports = function(pattern, opts) {
  opts = opts || {};

  var cwd = opts.cwd || process.cwd(),
      root = path.normalize(path.resolve(cwd, '/')),
      match = opts.match || minimatch,
      abspath = opts.abspath || false;

  if (process.platform === 'win32') {
    root = root.replace(/\\/g, '/');
  }

  // single pattern may expand to multiple base paths
  // as an expression can have multiple subexpressions
  var results = globToBasenames.sync(pattern),
      next = [];

  var bopts = {
        cwd: cwd,
        root: root
      },
      fopts = {
        pattern: pattern,
        abspath: abspath,
        cwd: cwd,
        match: match
      };

  // old school loops avoid stack growth
  for (var i = 0; i < results.length; i++) {
    // convert the base name to the appropriate root directory
    next.push(basenameToDirectory.sync(bopts, results[i]));
  }

  results = [];
  // construct tasks from every file path
  function taskify(item) {
    return function() {
      // traverse every subdirectory
      traverseDirectory.sync(item, function(item) {
        tasks.push(taskify(item));
      }).forEach(function(result) {
        results.push(result);
      });
    };
  }

  var task,
      tasks = next.map(taskify);

  // execute each task, augmenting the queue as necessary
  while (tasks.length > 0) {
    task = tasks.shift();
    task();
  }

  // filter matches
  return results.filter(function(filepath) {
    return filterPattern.sync(fopts, filepath);
  });
};
