# Latest

## 0.14.0

* 2019-06-08 0.14.0 update on-memory symbols information on `Save` via `updateOnSave` and `updateProc` settings.
  *Limitation* VS Code does not update `Outline` pane on `Save`, but does on modification of file.
  So, you need to modify file for updating that pane.
  As for `Ctrl+Shift+O` and `Ctrl+T`, you do not need such a operation.
* 2019-07-07 0.14.1 fix: successive backslashs within path token of tags file can not be handled correctly(#2).
  This fix is intended to work for [universal-ctags/ctags-win32](https://github.com/universal-ctags/ctags-win32).
* 2019-07-09 0.14.2 Workspace symbols are updated as another entities with absolute path(#3).
  After this patch, absolute paths are shown in `QuickOutline` (`Ctrl+T`).

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

## 0.11.0

* 2019-05-26 0.11.0 fix: isolate Symbols within each Workspaces.
  This is related to `Ctrl+T` search that had unstable behavior dependent on the timing of its execution.
* 2019-05-27 0.11.1 fix: README

## 0.12.0

* 2019-05-27 0.12.0 do not read tags file again when not modified
* 2019-05-27 0.12.1 fix: work only for first document.
* 2019-05-27 0.12.2 (again) do not read tags file again when not modified
* 2019-05-28 0.12.3 fix: (Workaround) sometimes Uri.path has DriveName with UpperCase.

## 0.13.0

* 2019-06-01 0.13.0 new setting: `fixedTagsFile` array.
  You can refer some tags files constantly from your opened Workspace or Folder.
* 2019-06-02 0.13.1 reload fixed tags file when modified.
* fix: any configuration does not works for `fixedTagsFile`
