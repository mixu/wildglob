readme.md

- add support for partial matching, except for **; everything else must match a single segment at a time
  - this means keeping a list of acceptable globs + indices into them
  - ending with ** should be easy non-prune
- prune before stat'ing; no need to stat anything that is pruned
- support using multiple pruning expressions (e.g. !)
- support multiple includes (avoid dup traversal)

## Algorithm

A glob expression is an expression which can potentially match against any path in the file system. For example `/foo/**` basically says take the whole file system and compare it against that expression, and return the result.

However, stat'ing the whole file system is obviously inefficient, since we can use the glob expression itself to narrow down the potential matches:

- first, we can parse the path prefix. This is done as follows:
  - tokenize the glob using `glob-parse`
  - take the prefix which consists of strings and brace expansion expressions. If you encounter an item which is not a string and not a brace expression (e.g. is a `?`, a `*`, a globstar (`**`), a set (`[]`) or a extglob (`@()`)), stop adding things to the prefix.
  - expand the brace expansion expressions to produce an array of paths
- next, start a directory traversal for each path.
- (TODO): apply exclude globs (up to their constant portion, including exclude globs with a globstar as the last item)
- once you have read the results, check against the include globs, then the any exclude globs.

`wildglob` takes the position that perfectly processing globstars and other wildcard expressions is probably more trouble than it is worth, since these expressions will generally not exclude any additional directories (which is the only way to reduce fs operations and provide a potential speedup). As you can see in the benchmark, this works out OK compared to Minimatch which does a more exact but more CPU-intensive matching before looking at the file system.

`wildglob` may perform some additional directory reads, but only if your file tree is such that only a very small portion of the files are included and you have not used exclude expressions to prune the search. If the majority of the files are included, then very little additional work takes place - often none at all, if all directories needed to be `readdir`'ed anyway. For example, if your include expression ends in the a globstar (as is typical), then this is the optimal behavior.

When the directory traversal starts, each include glob has been expanded so that only "tricky" parts remains. Matching a `?`, `*`, a globstar or a extglob is rather tricky - typically, glob implementations use backtracking to deal with wildcard expressions such as these expressions. This results in a fairly high branching factor particularly for globstars.

### Benchmark



### Further preformance improvements

An optimal implementation should use a minimum amount of CPU time and also avoid recursing into directories which will never produce matches. The latter part relies on the fixed portions of the glob expression having appropriate matches, which has diminishing returns once the prefix has been processed. Exclusions which will only speed up file matching will probably only have small returns.

- adding set expansion support (only improves performance for globs with sets)
- adding expansion support for extglob contents (only improves performance for globs with extglob expressions)
- performing full matching before traversing into a subdirectory
  - on exclude expressions only consisting of strings and braces
  - on exclude expressions ending in a globstar
- performing partial matching before traversing into a subdirectory
  - on include expressions (only where you can be certain that partial failure to match === complete failure to match => safe to exclude)
  - on exclude expressions (only where you can be certain that partial success === complete success => safe to exclude)
- filter before stat()ing
- speeding up the actual glob matching

Two types of globs:

- absolute globs: must be matched against the absolute path of each file
- relative globs: must be matched against the relative path of each file


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
