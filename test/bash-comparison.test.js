var fs = require('fs'),
    assert = require('assert'),
    Fixture = require('file-fixture'),
    glob = require('../index.js');

exports['tests'] = {

  before: function() {
    var self = this;
    this.fixture = new Fixture();

    this.relativeFixtureDir = this.fixture.dir({
      'test/a/.abcdef/x/y/z/a': 'i like tests',
      'test/a/abcdef/g/h': 'i like tests',
      'test/a/abcfed/g/h': 'i like tests',
      'test/a/b/c/d': 'i like tests',
      'test/a/bc/e/f': 'i like tests',
      'test/a/c/d/c/b': 'i like tests',
      'test/a/cb/e/f': 'i like tests'
    }, {});

    this.absFixtureDir = this.fixture.dirname({});
    [ 'foo', 'bar', 'baz', 'asdf', 'quux', 'qwer', 'rewq'].forEach(function (w) {
      fs.mkdirSync(self.absFixtureDir + '/' + w);
    });
  }

};

// create test cases

var bashResults = require('./bash-results.json'),
    globs = Object.keys(bashResults);

globs.forEach(function (pattern) {
  var expect = bashResults[pattern];
  var hasSymLink = expect.some(function (m) {
    return /\/symlink\//.test(m);
  });

  if (hasSymLink || pattern == 'test/a/*/+(c|g)/./d' || pattern == 'test/a/abc{fed/g,def}/**///**/' ) {
    return;
  }


  exports['tests'][pattern + ' sync'] = function() {
    var self = this,
        result = cleanResults(glob(pattern, { cwd: self.relativeFixtureDir }));
    console.log('result:', result);
    assert.deepEqual(result, expect);
  };

});

function alphasort (a, b) {
  a = a.toLowerCase()
  b = b.toLowerCase()
  return a > b ? 1 : a < b ? -1 : 0
}

function cleanResults (m) {
  // normalize discrepancies in ordering, duplication,
  // and ending slashes.
  return m.map(function (m) {
    return m.replace(/\/+/g, "/").replace(/\/$/, "")
  }).sort(alphasort).reduce(function (set, f) {
    if (f !== set[set.length - 1]) set.push(f)
    return set
  }, []).sort(alphasort).map(function (f) {
    // de-windows
    return (process.platform !== 'win32') ? f
           : f.replace(/^[a-zA-Z]:[\/\\]+/, '/').replace(/[\\\/]+/g, '/')
  })
}

// if this module is the script being run, then run the tests:
if (module == require.main) {
  var mocha = require('child_process').spawn('mocha', [
    '--colors', '--bail', '--ui', 'exports', '--reporter', 'spec', __filename
  ]);
  mocha.stderr.on('data', function (data) {
    if (/^execvp\(\)/.test(data)) {
     console.log('Failed to start child process. You need mocha: `npm install -g mocha`');
    }
  });
  mocha.stdout.pipe(process.stdout);
  mocha.stderr.pipe(process.stderr);
}
