var fs = require('fs'),
    assert = require('assert'),
    pi = require('pipe-iterators'),
    globToBasenames = require('../lib2/glob-to-basenames');

describe('glob to basenames test', function() {

  function run(input, done) {
    pi.fromArray(input)
      .pipe(globToBasenames())
      .pipe(pi.toArray(function(results) {
        done(results.length === 1 ? results[0] : results);
      }));
  }

  describe('absolute path', function() {

    it('ends with **', function(done) {
      run('/tmp/foo/**', function(actual){
        assert.equal(actual, '/tmp/foo/');
        done();
      });
    });

  });

  describe('relative path', function() {

    it('ends with *', function(done) {
      run('./*/*', function(actual){
        assert.equal(actual, './');
        done();
      });
    });

    it('ends with **', function(done) {
      run('tmp/foo/**', function(actual){
        assert.equal(actual, 'tmp/foo/');
        done();
      });
    });

    it('ends with char range', function(done) {
      run('js/t[a-z]', function(actual){
        assert.equal(actual, 'js/');
        done();
      });
    });

    it('ends with filename', function(done) {
      run('js/foo.js', function(actual){
        assert.equal(actual, 'js/');
        done();
      });
    });

    it('contains a brace expression', function(done) {
      run('{./*/*,./tmp/glob-test/*}', function(actual){
        assert.equal(actual[0], './');
        assert.equal(actual[1], './tmp/glob-test/');
        done();
      });
    });

  });

});
