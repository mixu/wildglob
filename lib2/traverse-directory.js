module.exports = function() {
  // now read the directory and all subdirectories:
  // if wildmatch supported partial matches we could prune the tree much earlier
  // console.log('dostat', prefix, 'read', read, 'remove', strip, affix);

  return pi.parallel(1, function(item, enc, done) {
    var stat, exists, err,
        isDir = false;

    // input values?
    var filepath = item.path,
        strip = item.strip,
        affix = item.affix,
        knownToExist = item.knownToExist;

    // the order between stat and filter does not matter, because we'll need to stat each
    // entry anyway to know if it's a dir, even if it fails the filter check (since the full path
    // can still match even if the current partial does not)
    // if we had accurate partial matching then yes, then filter before stat is slightly better.

    try {
      stat = fs.statSync(filepath);
    } catch (e) {
      err = e;
    }
    if (err) {
      switch(err.code) {
        case 'ELOOP':
          // like Minimatch, ignore ELOOP for purposes of existence check but not
          // for the actual stat()ing
          exists = knownToExist;
          break;
        case 'ENOENT':
          // ignore ENOENT (per Node core docs, "fs.exists() is an anachronism
          // and exists only for historical reasons. In particular, checking if a file
          // exists before opening it is an anti-pattern")
          exists = false;
          break;
        default:
          exists = false;
          // return done(err);
      }
    } else {
      exists = true;
      isDir = stat.isDirectory();
    }

    if (!isDir) {
      if (exists) {
        // no readdir, so the stat for this entry is done
        this.push(affix + absToRel(filepath, strip));
      }
      return done();
    }
    // must be a dir

    // try without a trailing slash
    this.push(affix + absToRel(filepath, strip)));
    // needed so that wildmatch treats dirs correctly (in some cases)
    if (filepath.charAt(filepath.length - 1) != '/') {
      this.push(affix + absToRel(filepath + '/', strip));
    }

    // if the input is a directory, readdir and process all entries in it
    var basepath = (filepath[filepath.length - 1] !== path.sep ? filepath + path.sep : filepath);
    var entries;
    try {
      entries = fs.readdirSync(basepath);
    } catch (e) {
      err = e;
    }
    if (err) {
      // console.log(err);
      switch(err.code) {
        case 'ENOTDIR':
        case 'ENOENT':
        case 'ELOOP':
        case 'ENAMETOOLONG':
        case 'UNKNOWN':
          break;
        default:
          // onError(err);
      }
      entries = [];
    }
    entries.forEach(function(f) {
      if (f.charAt(0) === '.') {
        return;
      }
      // queue a stat operation
      // filepath, strip, affix, knownToExist, onDone
      this.write({
        path: basepath + f,
        strip: strip,
        affix: affix,
        knownToExist: true
      });
    });
    // tasks have been queued so this entry is done
    done();
  });
};
