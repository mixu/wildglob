readme.md

- add support for partial matching, except for **; everything else must match a single segment at a time
  - this means keeping a list of acceptable globs + indices into them
  - ending with ** should be easy non-prune
- prune before stat'ing; no need to stat anything that is pruned
- support using multiple pruning expressions (e.g. !)
- support multiple includes (avoid dup traversal)


# Options

- `cwd`: The working directory in which to search for relative paths. Defaults to `process.cwd()`.


## Misc

Glob implementations:

- [git glob](https://github.com/git/git/blob/master/wildmatch.c)
- [Go glob](http://golang.org/src/pkg/path/filepath/match.go?s=5450:5505#L221)
- [Python glob](http://hg.python.org/cpython/file/2.7/Lib/fnmatch.py)
- [Java nio glob](http://grepcode.com/file/repository.grepcode.com/java/root/jdk/openjdk/7-b147/sun/nio/fs/Globs.java)
- [bash glob](http://git.savannah.gnu.org/cgit/bash.git/tree/lib/glob/glob.c)
- [BSD fnmatch](http://web.mit.edu/freebsd/csup/fnmatch.c)


bash -c "cd /tmp/dza5dosbiq9f6r/tyj28xi2nco6flxr/ && shopt -s globstar && shopt -s extglob && shopt -s nullglob && eval 'for i in test/a/*/+(c|g)/./d; do echo \$i; done' "
