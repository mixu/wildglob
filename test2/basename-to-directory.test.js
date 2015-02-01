var fs = require('fs'),
    assert = require('assert'),
    g2b = require('../lib2/glob-to-basenames');

describe('glob to basenames test', function() {


function run() {
      basenameToDirectory({
        cwd: cwd,
        root: root
      })

}

  it('works', function() {
    assert.equals(run('/tmp/foo/**'), '/tmp/foo');
  });

});
