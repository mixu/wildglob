module.exports = function(pattern, opts) {
  opts = opts || {};

  var cwd = opts.cwd || process.cwd(),
      root = path.normalize(path.resolve(cwd, '/')),
      found = [],
      match = opts.match || minimatch,
      abspath = opts.abspath || false;

  if (process.platform === 'win32') {
    root = root.replace(/\\/g, '/');
  }

  pi.fromArray(pattern)
    .pipe(pi.head([

      // single pattern may expand to multiple base paths
      // as an expression can have multiple subexpressions
      globToBasenames(),

      // convert the base name to the appropriate root directory
      basenameToDirectory({
        cwd: cwd,
        root: root
      }),

      // traverse every subdirectory
      traverseDirectory(),

      // filter matches
      filterPattern({
        pattern: pattern,
        abspath: abspath,
        cwd: cwd,
        match: match
      }),

      pi.toArray(function(results) {
        console.log(results);
      })
    ]);
};
