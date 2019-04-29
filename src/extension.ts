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
    if(documentFilterArray.length > 0) {
      context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
          documentFilterArray,
          new CtagsDocumentSymbolProvider(targetArray)
        )
      );
    }
  }
}

export function deactivate() { }

interface SbcConfig extends vscode.WorkspaceConfiguration {
  target: SbcTarget[];
}

interface SbcTarget {
  name: string;
  glob: string;
  ends: string[];
  kindMap: any;
}

const kind2SymbolKind: any = {
  'Array': vscode.SymbolKind.Array,
  'Boolean': vscode.SymbolKind.Boolean,
  'Class': vscode.SymbolKind.Class,
  'Constant': vscode.SymbolKind.Constant,
  'Constructor': vscode.SymbolKind.Constructor,
  'Enum': vscode.SymbolKind.Enum,
  'EnumMember': vscode.SymbolKind.EnumMember,
  'Event': vscode.SymbolKind.Event,
  'Field': vscode.SymbolKind.Field,
  'File': vscode.SymbolKind.File,
  'Function': vscode.SymbolKind.Function,
  'Interface': vscode.SymbolKind.Interface,
  'Key': vscode.SymbolKind.Key,
  'Method': vscode.SymbolKind.Method,
  'Module': vscode.SymbolKind.Module,
  'Namespace': vscode.SymbolKind.Namespace,
  'Null': vscode.SymbolKind.Null,
  'Number': vscode.SymbolKind.Number,
  'Object': vscode.SymbolKind.Object,
  'Operator': vscode.SymbolKind.Operator,
  'Package': vscode.SymbolKind.Package,
  'Property': vscode.SymbolKind.Property,
  'String': vscode.SymbolKind.String,
  'Struct': vscode.SymbolKind.Struct,
  'TypeParameter': vscode.SymbolKind.TypeParameter,
  'Variable': vscode.SymbolKind.Variable,
};

export class CtagsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  configArray: Array<SbcTarget>;

  constructor(configArray: Array<SbcTarget>) {
    this.configArray = configArray;
  }

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken) {

    //'.' means directory of code.exe
    const fileName = document.uri.path.replace(/.*\/([^\/]+)/, '$1');
    const dirName = document.uri.fsPath.replace(fileName, '');
    const config = this.configArray.find(aConfig => {
      const wk = aConfig.ends.find(nameEnd => { return fileName.endsWith(nameEnd); });
      return wk !== undefined;
    });
    const result: vscode.SymbolInformation[] = [];
    return new Promise<vscode.SymbolInformation[]>((resolve, reject) => {
      if(fs.existsSync(`${dirName}/.tags`)) {
        const kindMap = config !== undefined ? config.kindMap : undefined;
        const rs = fs.createReadStream(`${dirName}/.tags`);
        const lines = readline.createInterface(rs);
        lines.on('line', line => {
          const tokens = line.split('\t');
          if(tokens[1] === fileName) {
            const pos = tokens.length > 4
              ? parseInt(tokens[4].split(':')[1]) // lines:n
              : parseInt(tokens[2].replace(';"', '')); // nn;"
            let kind = vscode.SymbolKind.Constructor;
            if(kindMap !== undefined && kindMap[tokens[3]] !== undefined
              && kind2SymbolKind[kindMap[tokens[3]]] !== undefined) {
              kind = kind2SymbolKind[kindMap[tokens[3]]];
            }
            result.push(
              new vscode.SymbolInformation(
                tokens[0],
                kind,
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