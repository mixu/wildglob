var fs = require('fs'),
    assert = require('assert'),
    pi = require('pipe-iterators'),
    globToBasenames = require('../lib2/glob-to-basenames'),
    basenameToDirectory = require('../lib2/basename-to-directory');

describe('basename to directory test', function() {

  function run(input, done) {
    pi.fromArray(input)
      .pipe(globToBasenames())
      .pipe(basenameToDirectory({
        cwd: '/cwd',
        root: '/'
      }))
      .pipe(pi.toArray(function(results) {
        done(results.length === 1 ? results[0] : results);
      }));
  }

  it('works', function(done) {
    run('/tmp/foo/**', function(actual) {
     assert.deepEqual(actual, {
        path: '/tmp/foo/',
        strip: '',
        affix: '',
        knownToExist:false
      });
      done();
    });
  });

});
