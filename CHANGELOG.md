* 2019-04-29 0.2.0 `ends` and `kindMap` settings
* 2019-04-29 0.3.0 tags file name is one of 'tags', '.tags', 'TAGS'.
* 2019-05-03 0.4.0 tree structure of symbol, 
  only when tags file with following form, and settings has a `sro` property:

```
{Symbol Name}\t{File Name}\t{regex or so};"}\t{Type of Symbol(1 length)}\t{line:LineNumber}\t{structure(if exists)}
```

And you can get such a tags file by following command:

```console
PowerShell$ python d:/bin/rst2ctags.py -f .tags --sort=no docFoo.rst docBar.rst sub/subdoc.rst`
```

* 2019-05-03 0.5.0 tree structure of symbol, 
  only when settings has a `restartTree` property.


