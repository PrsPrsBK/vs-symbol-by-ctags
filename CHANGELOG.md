# Latest

## 0.11.0

* 2019-05-26 0.11.0 fix: isolate Symbols by each Workspaces.

# Release Notes

## 0.1.0

* 2019-04-22 0.1.0 show symbols within 'Outline' pane.

## 0.2.0

* 2019-04-29 0.2.0 `ends` and `kindMap` settings

## 0.3.0

* 2019-04-29 0.3.0 tags file name is one of 'tags', '.tags', 'TAGS'.

## 0.4.0

* 2019-05-03 0.4.0 tree structure of symbol, 
  only when tags file with following form, and settings has a `sro` property:

```
{Symbol Name}\t{File Name}\t{regex or so};"}\t{Type of Symbol(1 length)}\t{line:LineNumber}\t{structure(if exists)}
```

And you can get such a tags file by following command:

```console
PowerShell$ python d:/bin/rst2ctags.py -f .tags --sort=no docFoo.rst docBar.rst sub/subdoc.rst
```

## 0.5.0

* 2019-05-03 0.5.0 tree structure of symbol, 
  only when settings has a `restartTree` property.

## 0.6.0

* 2019-05-03 0.6.0 tags file now do not need to exists at the same directory as target file.
  Detection is done by traversing to workspace folder.

## 0.7.0

* 2019-05-06 0.7.0
* new Command: `nextSymbol`, `prevSymbol`
* fix: tags file path for no-Win32.

* 2019-05-06 0.7.1 fix: document

## 0.8.0

* 2019-05-06 0.8.0
* More accurate symbol name and position, only when **extended form of tags file**.
  Now you can jump to the head of symbol when you use `Ctrl+Shift+o`.

* 2019-05-07 0.8.2
* On `next/prevSymbol` command, cursor moves to the head of symbol,
  only when **extended form of tags file**.
* but scroll does not happen.

* 2019-05-07 0.8.3
* fix: On `next/prevSymbol` command, scroll does not happen.

* 2019-05-07 0.8.4
* fix: On Windows, spec within tags file may have paths separated by backslash.

## 0.9.0

* 2019-05-07 0.9.0 experimental `offSideRule` setting
* 2019-05-12 0.9.1 fix: next/prevCommand does not work before 'Outline' pane is shown or `Ctrl+Shift+o`.
* 2019-05-12 0.9.2 fix: (again) On Windows, spec within tags file may have paths separated by backslash.

## 0.10.0

* 2019-05-12 0.10.0 Workspase-wide symbol search via `Ctrl+t`, powered by `WorkspaceSymbolProvider`.
* 2019-05-19 0.10.1 fix: next/prev jump fails when doc was opened via `Ctrl+P` or `Ctrl+PageUp/Down`
* 2019-05-25 0.10.2 fix: runtime failure on new Location() results in 'No Symbol'
