var fs = require('fs'),
    path = require('path'),
    assert = require('assert'),
    Fixture = require('file-fixture'),
    glob = require('../index.js');

describe('basic tests', function() {

  before(function() {
    this.fixture = new Fixture();

    this.basicFixtureDir = this.fixture.dir({
      'foo/aa.js': 'test',
      'foo/bar/aa.js': 'test',
      'foo/bar/aa.txt': 'test'
    }, {});

    this.relativeFixtureDir = this.fixture.dir({
      'a/.abcdef/x/y/z/a': 'i like tests',
      'a/abcdef/g/h': 'i like tests',
      'a/abcfed/g/h': 'i like tests',
      'a/b/c/d': 'i like tests',
      'a/bc/e/f': 'i like tests',
      'a/c/d/c/b': 'i like tests',
      'a/cb/e/f': 'i like tests',
    }, {});
  });

  describe('passing in an empty value', function() {

    it('sync', function() {
      var result = glob.sync();
      assert.deepEqual(result, []);
    });

    it('async', function(done) {
      var result = glob(undefined, function(err, result) {
        assert.deepEqual(result, []);
        done();
      });
    });

    xit('stream', function(done) {
      var result = [];
      glob.stream()
          .on('error', function(err) { throw err; })
          .on('data', function(filepath) { result.push(filepath); })
          .once('end', function() {
            assert.deepEqual(result, []);
            done();
          });
    });

  });

  describe('basic sync', function() {
    it('foo/**/*.js works', function() {
      var result = glob.sync('foo/**/*.js', { cwd: this.basicFixtureDir }).sort();
      assert.deepEqual(result, [ 'foo/aa.js', 'foo/bar/aa.js' ]);
    });

    it('./foo/**/*.js works', function() {
      var result = glob.sync('./foo/**/*.js', { cwd: this.basicFixtureDir }).sort();
//      console.log(result);
      assert.deepEqual(result, [  './foo/aa.js', './foo/bar/aa.js' ]);
    });

    it('__dirname + /foo/**/*.js works', function() {
      var self = this;
      var result = glob.sync(this.basicFixtureDir + '/foo/**/*.js').sort();
//      console.log(result);
      assert.deepEqual(result, [ 'foo/aa.js', 'foo/bar/aa.js' ].map(function(str) {
        return self.basicFixtureDir + '/' + str;
      }));
    });
  });

  describe('basic async', function() {
    it('foo/**/*.js works', function(done) {
      glob('foo/**/*.js', { cwd: this.basicFixtureDir }, function(err, result){
        result.sort();
        assert.deepEqual(result, [ 'foo/aa.js', 'foo/bar/aa.js' ]);
        done();
      });
    });

    it('./foo/**/*.js works', function(done) {
      glob('./foo/**/*.js', { cwd: this.basicFixtureDir }, function(err, result){
        result.sort();
//      console.log(result);
        assert.deepEqual(result, [  './foo/aa.js', './foo/bar/aa.js' ]);
        done();
      });
    });

    it('__dirname + /foo/**/*.js works', function(done) {
      var self = this;

      glob(this.basicFixtureDir + '/foo/**/*.js', function(err, result){
        result.sort();
//      console.log(result);
        assert.deepEqual(result, [ 'foo/aa.js', 'foo/bar/aa.js' ].map(function(str) {
          return self.basicFixtureDir + '/' + str;
        }));
        done();
      });
    });

  });

  describe('cwd-test.js - changing cwd and searching for **/d', function(){

    before(function() {
      this.origCwd = process.cwd();
      process.chdir(this.relativeFixtureDir);
    });

    after(function() {
      process.chdir(this.origCwd);
    });

    it('cwd-test .', function(done) {
      glob('**/d', function(err, result){
        result.sort();
//      console.log(result);
        assert.deepEqual(result,  [ 'a/b/c/d', 'a/c/d' ]);
        done();
      });
    });

    it('cwd-test a', function(done) {
      glob('**/d', { cwd: path.resolve('a') }, function(err, result){
        result.sort();
//      console.log(result);
        assert.deepEqual(result,  [ 'b/c/d', 'c/d' ]);
        done();
      });
    });

    it('cwd-test a/b', function(done) {
      glob('**/d', { cwd: path.resolve('a/b') }, function(err, result){
        result.sort();
//      console.log(result);
        assert.deepEqual(result,  [ 'c/d' ]);
        done();
      });
    });

    it('cwd-test a/b/', function(done) {
      glob('**/d', { cwd: path.resolve('a/b/') }, function(err, result){
        result.sort();
//      console.log(result);
        assert.deepEqual(result,  [ 'c/d' ]);
        done();
      });
    });

    it('cwd-test process.cwd', function(done) {
      glob('**/d', { cwd: process.cwd() }, function(err, result){
        result.sort();
//      console.log(result);
        assert.deepEqual(result,  [ 'a/b/c/d', 'a/c/d' ]);
        done();
      });
    });

  });

  describe('empty-set.js - Patterns that cannot match anything', function() {
    it('empty-set "# comment"', function(done) {
      glob('# comment', function(err, result){
        result.sort();
//      console.log(result);
      // no error thrown
        assert.deepEqual(result, []);
        done();
      });
    });

    it('empty-set " "', function(done) {
      glob(' ', function(err, result){
        result.sort();
//      console.log(result);
      // no error thrown
        assert.deepEqual(result, []);
        done();
      });
    });

    it('empty-set "\\n"', function(done) {
      glob('\n', function(err, result){
        result.sort();
//      console.log(result);
      // no error thrown
        assert.deepEqual(result, []);
        done();
      });
    });

    it('empty-set "just doesnt happen to match anything so this is a control"', function(done) {
      glob('just doesnt happen to match anything so this is a control', function(err, result){
        result.sort();
//      console.log(result);
      // no error thrown
        assert.deepEqual(result, []);
        done();
      });
    });
  });

  xdescribe('error-callback.js - Ensure that fs errors do not cause duplicate errors', function() {

    before(function() {
      this.oldReaddir = fs.readdir;
      this.oldReaddirSync = fs.readdirSync;

      fs.readdir = function(path, cb) {
        process.nextTick(function() {
          cb(new Error('mock fs.readdir error'));
        });
      };

      fs.readdirSync = function(path) {
        throw new Error('mock fs.readdirSync error');
      };
    });

    xit('error callback - sync', function() {
      var err = false;
      try {
        glob.sync('*', { fs: fs });
      } catch (e) {
        // expecting an error
        err = e;
      }
      assert.ok(err, 'expecting error');
    });

    it('error callback - async', function(done) {
      glob('*', { fs: fs }, function(err) {
        assert.ok(err);
        done();
      });
    });

    after(function() {
      fs.readdir = this.oldReaddir;
      fs.readdirSync = this.oldReaddirSync;
    });

  });

});
