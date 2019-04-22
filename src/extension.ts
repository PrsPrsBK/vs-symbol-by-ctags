import * as vscode from 'vscode';
import fs from 'fs';
import readline from 'readline';

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
    for(const tgt of targetArray) {
      documentFilterArray.push({
        pattern: tgt.glob,
        scheme: 'file',
      });
    }
  }
  if(documentFilterArray.length > 0) {
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
  tags: string[];
}

export class CtagsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken) {

    //'.' means directory of code.exe
    const fileName = document.uri.path.replace(/.*\/([^\/]+)/, '$1');
    const dirName = document.uri.fsPath.replace(fileName, '');
    const result: vscode.SymbolInformation[] = [];
    return new Promise<vscode.SymbolInformation[]>((resolve, reject) => {
      if(fs.existsSync(`${dirName}/.tags`)) {
        const rs = fs.createReadStream(`${dirName}/.tags`);
        const lines = readline.createInterface(rs);
        lines.on('line', line => {
          const tokens = line.split('\t');
          if(tokens[1] === fileName) {
            const pos = tokens.length > 4
              ? parseInt(tokens[4].split(':')[1]) // lines:n
              : parseInt(tokens[2].replace(';"', '')); // nn;"
            result.push(
              new vscode.SymbolInformation(
                tokens[0],
                vscode.SymbolKind.Constant,
                '',
                new vscode.Location(document.uri, new vscode.Position(pos - 1, 0))
              )
            );
          }
        });
        lines.on('close', () => {
          rs.destroy();
          resolve(result);
        });
      }
      else {
        reject(result);
      }
    });
  }
}