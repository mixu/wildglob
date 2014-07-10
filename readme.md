readme.md

- add support for partial matching, except for **; everything else must match a single segment at a time
  - this means keeping a list of acceptable globs + indices into them
  - ending with ** should be easy non-prune
- prune before stat'ing; no need to stat anything that is pruned
- support using multiple pruning expressions (e.g. !)
- support multiple includes (avoid dup traversal)


# Options

- `cwd`: The working directory in which to search for relative paths. Defaults to `process.cwd()`.

