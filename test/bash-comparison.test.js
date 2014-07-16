var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    Fixture = require('file-fixture'),
    glob = require('../index.js');

exports['tests'] = {

  before: function(done) {
    var self = this;
    this.fixture = new Fixture();

    this.relativeFixtureDir = this.fixture.dir({
      'test/a/.abcdef/x/y/z/a': 'i like tests',
      'test/a/abcdef/g/h': 'i like tests',
      'test/a/abcfed/g/h': 'i like tests',
      'test/a/b/c/d': 'i like tests',
      'test/a/bc/e/f': 'i like tests',
      'test/a/c/d/c/b': 'i like tests',
      'test/a/cb/e/f': 'i like tests',
      // minimatch just runs in it's own directory, which is a bit annoying, create a real fixture
      'examples/g.js': 'test',
      'node_modules/graceful-fs': 'test',
      'README.md': 'test'
    }, {});

    this.absFixtureDir = this.fixture.dirname({});
    [ 'foo', 'bar', 'baz', 'asdf', 'quux', 'qwer', 'rewq'].forEach(function (w) {
      fs.mkdirSync(self.absFixtureDir + '/' + w);
    });

    var symlinkFrom = path.resolve(this.relativeFixtureDir, './test/a/symlink/a/b/c');
    var symlinkTo = path.resolve(this.relativeFixtureDir, './test/a/symlink/a/b/c/../..');

    var d = path.dirname(symlinkTo);

    fs.mkdirSync(path.resolve(this.relativeFixtureDir, './test/a/symlink'));
    fs.mkdirSync(path.resolve(this.relativeFixtureDir, './test/a/symlink/a'));
    fs.mkdirSync(path.resolve(this.relativeFixtureDir, './test/a/symlink/a/b'));

    console.log(symlinkFrom, symlinkTo);

    fs.symlink('../..', symlinkFrom, "dir", function (err) {
      if (err) {
        throw err;
      }
      done();
    });
  }

};

// create test cases

var bashResults = require('./bash-results'),
    globs = Object.keys(bashResults);

globs.forEach(function (pattern) {
  var expect = bashResults[pattern];
  var hasSymLink = expect.some(function (m) {
    return false;
    return /\/symlink\//.test(m);
  });

  if (hasSymLink ) {
    return;
  }

  exports['tests'][pattern + ' sync'] = function() {
    var self = this, result;
    // replace /tmp/glob-test with self.absFixtureDir
    pattern = pattern.replace('/tmp/glob-test', this.absFixtureDir);
    expect = cleanResults(
        expect.map(function(str) {
            return str.replace('/tmp/glob-test', self.absFixtureDir);
        }));
    result = cleanResults(glob(pattern, { cwd: self.relativeFixtureDir }));

    if (expect.length < 20) {
      console.log('expect', expect);
      console.log('result', result);
    } else {
      expect.forEach(function(value, i) {
        var resultValue = result[i];
        if (value != resultValue) {
          console.log('diff', i, value, resultValue);
        }
      });
    }

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
