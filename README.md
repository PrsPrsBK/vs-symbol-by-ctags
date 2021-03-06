Anyway I want symbols.

Sometimes there is no language support like FooLang-mode or language server,
such that works well with symbols (jump between them or so).
But you want to edit files right now -- in my case,
[reStructuredText](http://docutils.sourceforge.net/rst.html)
and [PonyLang](https://www.ponylang.io/) files.
So let's rely on ctags' power.


# How to use

This extension works for the cases that you operate on files by 'Open Workspace' or by 'Open Folder', 
and does not work for the case of 'Open File'.

At first, prepare tags file, and then, activate this extension by `Symbol by Ctags` command.
tags file name is one of `tags`, `.tags`, `TAGS`.

If your tags file is load and your target file has symbols, some changes will happen.
Some items will be appear within `Outline` pane of `Explorer` side-bar,
and you can search symbols by typing it's name
via `Ctrl+Shift+O` (or type `@` after `Ctrl+P`)
(keybinds depends on your settings and physical keyboard. I use japanese keyboard on Windows 10.).

Since 0.10.0, you can workspace-wide symbol search via `Ctrl+T` (case-sensitive and rough).

Since 0.14.0, you can update on-memory symbol information on `Save` the file (and stil need to have `tags` file for initial state).

# command

Two commands are provided.

```keybindings.json
  {
    "key": "ctrl+shift+j",
    "command": "extension.nextSymbol",
    "when": "editorTextFocus"
  },
  {
    "key": "ctrl+shift+k",
    "command": "extension.prevSymbol",
    "when": "editorTextFocus"
  }
```


# tags file format

Currently, we support two formats, and **need LineNumber**.

```console
# this is output of Exuberant Ctags
# for example, `ctags -f .tags --sort=no --excmd=number *`
# Symbol Name \t File Name \t LineNumber;" \t Type of Symbol(1 length)
WordHandler	main.pony	8;"	c
apply	main.pony	17;"	f
```

```console
# this is another output format of Exuberant Ctags.
# for example, `ctags -f tags --sort=no --fields=nksaSmtf *`
# Symbol Name \t File Name \t regex;" \t Type of Symbol(1 length) \t line:LineNumber \t something...
WordHandler	main.pony	/^class WordHandler is ReadlineNotify$/;"	c	line:8
apply	main.pony	/^  fun ref apply(line: String, prompt: Promise[String]) =>$/;"	f	line:17
```

```console
# this is output of rst2ctags.py
# for example, `python x:/path/to/rst2ctags.py -f .tags --sort=no foo.rst bar.rst baz.rst`
# Symbol Name \t File Name \t regex;" \t Type of Symbol(1 length) \t line:LineNumber \t something of structure(if exists)
RootSection	foo.rst	/^RootSection$/;"	s	line:2
hello	foo.rst	/^hello$/;"	s	line:183	section:RootSection|ParentSection
world	foo.rst	/^world$/;"	s	line:6	section:RootSection
```


# Settings

## `target`

`target` array has settings-objects for each lauguage,
and each settings-object has some properties.

* `name`: string. some description.
* `glob`: Glob string used to get VS Code to show symbols within Outline panel for files.
  `"**/*.rst"` or so.
  [reference for Glob](https://code.visualstudio.com/api/references/vscode-api#GlobPattern).
* `ends`: array of string used to match settings with files. [ `".rst"` ] or so.
  This property may look to be duplication of `glob`,
  and in future, may become deprecated.
* `kindMap`: object. Mapping ctag's `kind` (1 length string) to VS Code's `SymbolKind`.
  [reference for SymbolKind](https://code.visualstudio.com/api/references/vscode-api#SymbolKind)
* `restartTree`: string composed of Type of Symbol(each has 1 length).
  If the type of symbol is included in this string, 
  the symbol is top of tree and has symbols that appear after 'top' and before next 'restart', as a child.
  **That is, you can have only 1 level depth trees**.
* `sro`: string that is Scope Resolution Operator (borrowed from Vim's great [Tagbar](https://github.com/majutsushi/tagbar) by majutsushi).
  This works for tags files of extended form, such as one by `rst2ctags.py`.
  **In this case, you can have greater than 1 level depth trees**.
* `offSideRule` (experimental): boolean, and do not work with `restartTree`.
  For languages of off-side rule (Pony, F#, Python, ...),
  symbol tree have nested structure corresponding to indent level.
  I felt that elaborating this will not have so nice effects,
  because apparently we can not cover so much pattern of code-structure.
  But we may get more accurate range of each definition and utilize that for other feature,
  so this experiment happened.
* `updateOnSave`: boolean. `true` means to update symbols information on `Save` the file.
* `updateProc`: array of string, that represents an execution of ctags program.
  This works only for **updating** on-memory symbols information on `Save`, not for generation of initial `tags` file.
  This array starts with ctags executable, and needs to be passed stdio. See example below.

## `fixedTagsFile`

`fixedTagsFile` array has strings. each strings is path to tags file.
After `Symbol by Ctags` command, these tags files will be referenced in whole workspace, 
beyond each workspace-folders.


## example

For workspace following, write to `some.code-workspace` file:

```console
(xxx):.
├─some.code-workspace
├─WsRoot
│  ├─Folder01
│  ├─Folder02
│  └─Folder03
```

```some.code-workspace
{
  "folders": [
    {
      "path": "WsRoot/Folder01"
    },
    {
      "path": "WsRoot/Folder02"
    },
    {
      "path": "WsRoot/Folder03"
    }
  ],
  "settings": {
    "editor.tabSize": 2, // or so...

    "SymbolByCtags":{
      "fixedTagsFile": [ "X:/path/to/tags" ],
      "target": [
        {
          "name": "reStructuredText(just description)",
          "glob": "**/*.rst",
          "ends": [ ".rst" ],
          "kindMap": {
            "s": "Struct",
          },
          "sro": "|",
          "updateOnSave": true,
          "updateProc": [
            "python",
            "x:/path/to/rst2ctags.py",
            "-f",
            "-",
            "--sort=no",
          ],
        },
        {
          "name": "pony",
          "glob": "**/*.pony",
          "ends": [ ".pony" ],
          "kindMap": {
            "a": "Class",
            "b": "Function",
            "c": "Class",
            "f": "Function",
            "i": "Interface",
            "n": "Constructor",
            "t": "Interface",
            "p": "Class",
            "y": "Class",
          },
          "restartTree": "acipty",
          // or "offSideRule": true
          "updateOnSave": true,
          "updateProc": [
            "ctags",
            "-f",
            "-",
            "--sort=no",
            "--fields=nksaSmtf",
            "--languages=pony",
          ],
        }
      ]
    }
  }
}
```

In the case that you use 'Open as folder', write to `someFolder/.vscode/settings.json`:

```console
(someFolder):.
├─.vscode/
│  └─settings.json
├─yourWork/
├─
```

```settings.json
{
  "SymbolByCtags":{
    // some settings
  }
}
```


# TODO

* [author want] working without tags file.
* [author maybe want] completion. but `sro` may not be simple, e.g. `.` and `.>` and so.


# Known Issues

In short, the capability is limited very much, and under dogfooding.
Maybe all things are easy to be changed, excuse me.

* need to be activated by command, intended not to bother other extensions.

  * `"workspaceContains:**/.tags"` or so ~~may be better~~ is not appropriate,
    because project may have tags file and want this extension not to work at all.

* do not jump between files like a `go to definition`, other than `Ctrl+T`.
* do not rename.
* do not generate ctags file.
* do not see the change of ctags file instantly. If re-open the file, changes will be effected.
* do not watch the change of settings file. If re-open workspace, changes will be effected.
* If any document is not yet opened at all, `Ctrl+T` will not work.
* ~~As for tags file of `fixedTagsFile` settings, no update to tags file will not be work after loaded once.~~ at ver. 0.13.1 resolved.
* VS Code does not update `Outline` pane on `Save`, but does on modification of file.
  So, you need to modify file for updating that pane.
  As for `Ctrl+Shift+O` and `Ctrl+T`, you do not need such a operation.


# Thanks

Icon uses [hakusyu font(白舟書体)](http://www.hakusyu.com/), semi-cursive script edition (hkgyokk.zip).
[LICENSE(Japanese)](http://www.hakusyu.com/licensing.htm#8)

