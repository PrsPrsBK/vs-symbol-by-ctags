Anyway I want symbols.

At first, prepare ctags file, and then, activate this extension by `Symbol by Ctags` command.

tags file format
====================

Now we handle two types, and **need LineNumber**.

```console
# this is output of Exuberant Ctags
# Symbol Name \t File Name \t LineNumber;" \t Type of Symbol
WordHandler	main.pony	8;"	c
apply	main.pony	17;"	f
```

```console
# this is output of rst2ctags.py
# Symbol Name \t File Name \t regex;" \t Type of Symbol \t line:LineNumber \t something of structure
hello	foo.rst	/^hello$/;"	s	line:183	section:RootSection|ParentSection
world	foo.rst	/^world$/;"	s	line:6	section:RootSection
```

Known Issues
====================

In short, the capability is limited very much, and under dogfooding.

* need to be activated by command.
  `"workspaceContains:**/.tags"` or so may be better.
* tags file name is limited: `.tags`.
* tags file needs to exists the same directory as target file.
* categorized only as `Constant`
* do not jump between files.
* do not rename.
* do not generate ctags file.
* (Maybe) do not watch the change of ctags file.
