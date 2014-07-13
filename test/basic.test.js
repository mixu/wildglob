var fs = require('fs'),
    assert = require('assert'),
    Fixture = require('file-fixture'),
    glob = require('../index.js');

exports['tests'] = {

  before: function() {
    this.fixture = new Fixture();

    this.basicFixtureDir = this.fixture.dir({
      'foo/aa.js': 'test',
      'foo/bar/aa.js': 'test',
      'foo/bar/aa.txt': 'test'
    }, {});
/*
    this.relativeFixtureDir = this.fixture.dir({
      'a/.abcdef/x/y/z/a': 'i like tests',
      'a/abcdef/g/h': 'i like tests',
      'a/abcfed/g/h': 'i like tests',
      'b/c/d': 'i like tests',
      'bc/e/f': 'i like tests',
      'c/d/c/b': 'i like tests',
      'cb/e/f': 'i like tests'
    });

    this.absFixtureDir = this.fixture.dirname();
    [ 'foo', 'bar', 'baz', 'asdf', 'quux', 'qwer', 'rewq'].forEach(function (w) {
      fs.mkdirSync(self.absFixtureDir + '/' + w);
    });
*/
  },

  'basic sync': {
    'foo/**/*.js works': function() {
      var result = glob('foo/**/*.js', { cwd: this.basicFixtureDir }).sort();
      assert.deepEqual(result, [ 'foo/aa.js', 'foo/bar/aa.js' ]);
    },

    './foo/**/*.js works': function() {
      var result = glob('./foo/**/*.js', { cwd: this.basicFixtureDir }).sort();
      console.log(result);
      assert.deepEqual(result, [  './foo/aa.js', './foo/bar/aa.js' ]);
    },

    '__dirname + /foo/**/*.js works': function() {
      var self = this,
          result = glob(this.basicFixtureDir + '/foo/**/*.js').sort();
      console.log(result);
      assert.deepEqual(result, [ 'foo/aa.js', 'foo/bar/aa.js' ].map(function(str) {
        return self.basicFixtureDir + '/' + str;
      }));
    }
  },

  'cwd-test.js - changing cwd and searching for **/d': {

    'before': function() {
      this.origCwd = process.cwd();
      process.chdir(__dirname);
    },

    'after': function() {
      process.chdir(origCwd);
    },

    '.': function() {
      var result = glob('**/d').sort();
      console.log(result);
      assert.deepEqual(result,  [ 'a/b/c/d', 'a/c/d' ]);
    },

    'a': function() {
      var result = glob('**/d', { cwd: path.resolve('a') });
      console.log(result);
      assert.deepEqual(result,  [ 'b/c/d', 'c/d' ]);
    },

    'a/b': function() {
      var result = glob('**/d', { cwd: path.resolve('a/b') });
      console.log(result);
      assert.deepEqual(result,  [ 'c/d' ]);
    },

    'a/b/': function() {
      var result = glob('**/d', { cwd: path.resolve('a/b/') });
      console.log(result);
      assert.deepEqual(result,  [ 'c/d' ]);
    },

    'process.cwd': function() {
      var result = glob('**/d', { cwd: process.cwd() }).sort();
      console.log(result);
      assert.deepEqual(result,  [ 'a/b/c/d', 'a/c/d' ]);
    }
  },

  'empty-set.js - Patterns that cannot match anything': {
    '# comment': function() {
      var result = glob('# comment').sort();
      console.log(result);
      // no error thrown
      assert.deepEqual(result, []);
    },

    ' ': function() {
      var result = glob(' ').sort();
      console.log(result);
      // no error thrown
      assert.deepEqual(result, []);
    },

    '\n': function() {
      var result = glob('\n').sort();
      console.log(result);
      // no error thrown
      assert.deepEqual(result, []);
    },

    'just doesnt happen to match anything so this is a control': function() {
      var result = glob('just doesnt happen to match anything so this is a control').sort();
      console.log(result);
      // no error thrown
      assert.deepEqual(result, []);
    }
  },

  'error-callback.js - Ensure that fs errors do not cause duplicate errors': {

    before: function() {
      self.oldReaddir = fs.readdir;

      fs.readdir = function(path, cb) {
        process.nextTick(function() {
          cb(new Error('mock fs.readdir error'));
        });
      };
    },

    // todo: async is probably better for these
    'error callback': function() {
      try {
        glob('*');
      } catch (e) {
        // expecting an error
        assert.ok(true);
      }
      assert.ok(false);
    },

    after: function() {
      fs.readdir = self.oldReaddir;
    }
  }
};

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
