import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('"symbol-by-ctags" is now active!');

  let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
    vscode.window.showInformationMessage('HelloA World!');
  });

  context.subscriptions.push(disposable);
}

export function deactivate() { }
