var fs = require('fs'),
    assert = require('assert'),
    pi = require('pipe-iterators'),
    globToBasenames = require('../lib2/glob-to-basenames'),
    basenameToDirectory = require('../lib2/basename-to-directory'),
    traverseDirectory = require('../lib2/traverse-directory'),
    Fixture = require('file-fixture');

describe('traverse directory test', function() {

  before(function() {
    this.fixture = new Fixture();

    this.basicFixtureDir = this.fixture.dir({
      'foo/aa.js': 'test',
      'foo/bar/aa.js': 'test',
      'foo/bar/aa.txt': 'test'
    }, {});
  });

  function run(input, opts, done) {
    pi.fromArray(input)
      .pipe(globToBasenames())
      .pipe(basenameToDirectory({
        cwd: opts.cwd,
        root: '/'
      }))
      .pipe(traverseDirectory())
      .pipe(pi.toArray(function(results) {
        done(results.length === 1 ? results[0] : results.sort());
      }));
  }

  it('works', function(done) {
    run('foo/**/*.js', { cwd: this.basicFixtureDir }, function(actual) {
     assert.deepEqual(actual,
        [ 'foo', 'foo/',
          'foo/aa.js',
          'foo/bar', 'foo/bar/',
          'foo/bar/aa.js', 'foo/bar/aa.txt']
      );
      done();
    });
  });

});
