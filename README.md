Anyway I want symbols.

At first, prepare ctags file, and then, activate this extension by `Symbol by Ctags` command.


====================
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
