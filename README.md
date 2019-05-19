Anyway I want symbols.

Sometimes there is no language support like FooLang-mode or language server,
such that works well with symbols (jump between them or so).
But you want to edit files right now -- in my case,
[reStructuredText](http://docutils.sourceforge.net/rst.html)
and [PonyLang](https://www.ponylang.io/) files.
So let's rely on ctags' power.


How to use
====================

At first, prepare tags file, and then, activate this extension by `Symbol by Ctags` command.
tags file name is one of `tags`, `.tags`, `TAGS`.

If your tags file is load and your target file has symbols, some changes will happen.
Some items will be appear within `Outline` pane of `Explorer` side-bar,
and you can search symbols by typing it's name
via `Control + Shift + o` (or type `@` after `Control + p`)
(keybinds depends on your settings and physical keyboard. I use japanese keyboard on Windows 10.).

Since 0.10.0, you can workspace-wide symbol search via `Control + t` (case-sensitive and rough).


command
====================

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


tags file format
====================

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


Settings
====================

`target` array has settings-objects for each lauguage,
and each settings-object has some properties.

* `name`: string. some description.
* `glob`: Glob string. `**/*.rst` or so.
  [reference for Glob](https://code.visualstudio.com/api/references/vscode-api#GlobPattern)
* `ends`: array of string used to match settings with files. [ `.rst` ] or so.
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
      "target": [
        {
          "name": "reStructuredText(just description)",
          "glob": "**/*.rst",
          "ends": [ ".rst" ],
          "kindMap": {
            "s": "Struct",
          },
          "sro": "|"
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
          "restartTree": "acipty"
          // or "offSideRule": true
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


TODO
====================

* Separate getting and storing informations of 'doc and its tags file'.
* Caching informations of 'doc and its symbols'.
* After above things done.

  * ~~Reference Provider~~ maybe impossible.
  * ~~Rename Provider~~ maybe impossible or not worth implementing (you can resort to `Ctrl+H` and confirm one by one).


Known Issues
====================

In short, the capability is limited very much, and under dogfooding.
Maybe all things are easy to be changed, excuse me.

* need to be activated by command, intended not to bother other extensions.

  * `"workspaceContains:**/.tags"` or so ~~may be better~~ is not appropriate,
    because project may have tags file and does not want this extension to work at all.

* do not jump between files like a `go to definition`, other than `Ctrl+t`.
* do not rename.
* do not generate ctags file.
* do not see the change of ctags file instantly. If re-open the file, changes will be effected.
* do not watch the change of settings file. If re-open workspace, changes will be effected.
