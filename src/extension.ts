import * as vscode from 'vscode';
import fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  console.log('"symbol-by-ctags" is now active!');

  let disposable = vscode.commands.registerCommand('extension.helloWorld', () => {
    vscode.window.showInformationMessage('HelloAA World!');
  });

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.languages.registerDocumentSymbolProvider(
      { pattern: '**/*.rst', scheme: 'file', },
      new CtagsDocumentSymbolProvider()
    )
  );
}

export function deactivate() { }

export class CtagsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken): vscode.SymbolInformation[] {

    //'.' means directory of code.exe
    const fileName = document.uri.path.replace(/.*\/([^\/]+)/, '$1');
    const dirName = document.uri.fsPath.replace(fileName, '');
    let wk = fs.existsSync(`${dirName}/.tags`);
    const result: vscode.SymbolInformation[] = [];
    result.push(
      new vscode.SymbolInformation(
        'foo_function',
        vscode.SymbolKind.Function,
        '',
        new vscode.Location(document.uri, new vscode.Position(10, 0))
      )
    );

    return result;
  }
}