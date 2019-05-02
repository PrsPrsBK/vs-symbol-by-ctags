Anyway I want symbols.

Sometimes there is no language support like FooLang-mode or language server,
such that works well with symbols (jump between them or so).
But you want to edit files right now -- in my case, reStructuredText and Pony files.
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
# for example, `ctags -f .tags_fields --sort=no --fields=nksaSmtf *`
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
* `sro`: string that is Scope Resolution Operator (borrowed from Vim's great Tagbar).
  This works for tags files of extended form, such as one by `rst2ctags.py`.
  **In this case, you can have greater than 1 level depth trees**.

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

Known Issues
====================

In short, the capability is limited very much, and under dogfooding.
Maybe all things are easy to be changed, excuse me.

* need to be activated by command.
  `"workspaceContains:**/.tags"` or so may be better.
* tags file needs to exists the same directory as target file.
* do not jump between files.
* do not rename.
* do not generate ctags file.
* do not see the change of ctags file instantly. If re-open the file, changes will be effected.
* do not watch the change of settings file. If re-open workspace, changes will be effected.
