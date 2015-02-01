var fs = require('fs'),
    assert = require('assert'),
    g2b = require('../lib2/glob-to-basenames');

describe('glob to basenames test', function() {

  function run(input, done) {
    pi.fromArray(input)
      .pipe(g2b())
      .pipe(pi.toArray(function(results) { done(results[0]); });
  }

  it('works', function() {
    assert.equals(run('/tmp/foo/**'), '/tmp/foo');
  });

});
