var pi = require('pipe-iterators'),
    pipeline = require('./lib2/pipeline'),
    pipelineSync = require('./lib2/pipeline-sync');

module.exports = glob;

function glob(pattern, opts, done) {
  var emitted = false;
  if (typeof opts === 'function') {
    done = opts;
    opts = {};
  }

  pi.fromArray(pattern)
    .pipe(pipeline(pattern, opts).once('error', function(err) {
      if (!emitted) {
        done(err);
        emitted = true;
      }
    }))
    .pipe(pi.toArray(function(results) {
      if (!emitted) {
        done(null, results);
        emitted = true;
      }
    }));
};

glob.sync = function(pattern, opts) {
  return pipelineSync(pattern, opts);
};

glob.stream = function(pattern, opts) {
  // TODO should we execute the pipeline as well?
  // return the pipeline
  return pipeline(pattern, opts);
};
