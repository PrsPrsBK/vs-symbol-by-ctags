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
  sro: string;
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

const tagsFileList = [ 'tags', '.tags', 'TAGS' ];

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
    const config: (SbcTarget | undefined) = this.configArray.find(aConfig => {
      const wk = aConfig.ends.find(nameEnd => { return fileName.endsWith(nameEnd); });
      return wk !== undefined;
    });
    // sro: Scope Resolution Operator, '::' in C++, '.' in Java.
    const sro: string = config !== undefined ? config.sro : '';
    const result: vscode.DocumentSymbol[] = [];
    return new Promise<vscode.DocumentSymbol[]>((resolve, reject) => {
      const tagsFileName = tagsFileList.find(f => { return fs.existsSync(`${dirName}/${f}`); });
      if(tagsFileName === undefined) {
        console.error('tags file not found.');
        reject(result);
      }
      else {
        const kindMap = config !== undefined ? config.kindMap : undefined;
        const rs = fs.createReadStream(`${dirName}/${tagsFileName}`);
        const lines = readline.createInterface(rs);

        lines.on('line', line => {
          // currently read all lines. if 'not sorted by symbolname', to stop readline is better.
          const tokens = line.split('\t');
          if(tokens[1] === fileName) {
            const symbolName = tokens[0];
            const pos = tokens.length > 4
              ? parseInt(tokens[4].split(':')[1]) // lines:n
              : parseInt(tokens[2].replace(';"', '')); // nn;"
            let kind = vscode.SymbolKind.Constructor;
            if(kindMap !== undefined
              && kindMap[tokens[3]] !== undefined
              && kind2SymbolKind[kindMap[tokens[3]]] !== undefined) {
              kind = kind2SymbolKind[kindMap[tokens[3]]];
            }

            const currentSymbol = new vscode.DocumentSymbol(
              symbolName,
              '',
              kind,
              new vscode.Range(pos - 1, 0, pos, 10), // 10 and 'pos' has no meaning
              new vscode.Range(pos - 1, 0, pos - 1, 10)
            );
            currentSymbol.children = [];
            // case of rst2ctags.py
            // tokens[5] takes form of 'section:foo|bar...'
            if(tokens.length > 5 && tokens[5] !== '' && sro !== '') {
              let parent: (vscode.DocumentSymbol | undefined) = undefined;
              for(const ancestor of tokens[5].slice(1 + tokens[5].indexOf(':')).split(sro)) {
                console.log(`${symbolName}'s ancestor: ${ancestor}`);
                if(parent === undefined) { // 1st ansector
                  parent = result.find(docSym => {
                    return docSym.name === ancestor;
                  });
                }
                else {
                  parent = parent.children.find(docSym => {
                    return docSym.name === ancestor;
                  });
                }
                if(parent === undefined) { // failed one
                  break;
                }
              }
              if(parent === undefined) {
                console.error(`${new Date().toLocaleTimeString()} ERROR: ${symbolName}: at symbol hierarchy spec within tags file`);
                result.push(currentSymbol);
              }
              else {
                parent.children.push(currentSymbol);
              }
            }
            else {
              result.push(currentSymbol);
            }
          }
        });

        lines.on('close', () => {
          rs.destroy();
          resolve(result);
        });
      }
    });
  }
}