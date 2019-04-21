import * as vscode from 'vscode';
import fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  console.log('"symbol-by-ctags" is now active!');

  const activateCommand = vscode.commands.registerCommand('extension.symbolByCtags', () => {
    vscode.window.showInformationMessage('activated: Symbol by Ctags');
  });
  context.subscriptions.push(activateCommand);

  // later config: SbcConfig or so
  const config = vscode.workspace.getConfiguration('SymbolByCtags');
  const documentFilterArray: vscode.DocumentFilter[] = [];
  const targetArray = config.get<SbcTarget[]>('target');
  if(targetArray !== undefined) {
    console.log('yes');
    for(const tgt of targetArray) {
      console.log(JSON.stringify(tgt));
      documentFilterArray.push({
        pattern: tgt.glob,
        scheme: 'file',
      });
    }
  }
  if(documentFilterArray.length > 0) {
    console.log('register');
    context.subscriptions.push(
      vscode.languages.registerDocumentSymbolProvider(
        documentFilterArray,
        new CtagsDocumentSymbolProvider()
      )
    );
  }
}

export function deactivate() { }

interface SbcConfig extends vscode.WorkspaceConfiguration {
  tags: string[];
  target: SbcTarget[];
}

interface SbcTarget {
  name: string;
  glob: string;
  exec: string;
  tags: string;
}

export class CtagsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken): vscode.SymbolInformation[] {

    //'.' means directory of code.exe
    const fileName = document.uri.path.replace(/.*\/([^\/]+)/, '$1');
    const dirName = document.uri.fsPath.replace(fileName, '');
    if(fs.existsSync(`${dirName}/.tags`)) {
    }
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