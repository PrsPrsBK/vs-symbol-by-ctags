import * as vscode from 'vscode';
import fs from 'fs';
import readline from 'readline';

export function activate(context: vscode.ExtensionContext) {
  console.log('"symbol-by-ctags" is now active!');

  const activateCommand = vscode.commands.registerCommand('extension.symbolByCtags', () => {
    vscode.window.showInformationMessage('activated: Symbol by Ctags');
  });
  context.subscriptions.push(activateCommand);

  const nextSymbolCommand = vscode.commands.registerCommand('extension.nextSymbol', () => {
    vscode.window.showInformationMessage('next symbol');
    nextSymbol();
  });
  context.subscriptions.push(nextSymbolCommand);

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
  restartTree: string;
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

let symbolPositions: number[] = [];

const nextSymbol = () => {
  const activeTextEditor = vscode.window.activeTextEditor;
  if(activeTextEditor !== undefined) {
    const currentLine = activeTextEditor.selection.active.line;
    console.log(`${JSON.stringify(activeTextEditor.selection)}`);
    const nextLine = symbolPositions.find(nthLine => currentLine < nthLine);
    if(nextLine !== undefined) {
      activeTextEditor.selection = new vscode.Selection(
        nextLine, 0, nextLine, 0
      );
    }
  }
};

export class CtagsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  configArray: Array<SbcTarget>;

  constructor(configArray: Array<SbcTarget>) {
    this.configArray = configArray;
  }

  public provideDocumentSymbols(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken) {

    symbolPositions = [];
    const wf = vscode.workspace.getWorkspaceFolder(document.uri);
    if(wf !== undefined) {
      console.log(`wf: ${wf.uri.path}`); // /x:/path/to/folder
    }
    //'.' means directory of code.exe
    const fileName = document.uri.path.replace(/.*\/([^\/]+)/, '$1');
    const dirPath = document.uri.path.replace(/(.+)\/[^\/]+$/, '$1').slice(1);
    const config: (SbcTarget | undefined) = this.configArray.find(aConfig => {
      const wk = aConfig.ends.find(nameEnd => { return fileName.endsWith(nameEnd); });
      return wk !== undefined;
    });
    // sro: Scope Resolution Operator, '::' in C++, '.' in Java.
    const sro: string = (config !== undefined && config.sro !== undefined)
      ? config.sro : '';
    // top of tree
    const restartTree: string = (config !== undefined && config.restartTree !== undefined)
      ? config.restartTree : '';

    const result: vscode.DocumentSymbol[] = [];
    return new Promise<vscode.DocumentSymbol[]>((resolve, reject) => {
      let tagsFileName = tagsFileList.find(f => { return fs.existsSync(`${dirPath}/${f}`); });
      let tagsDirPath = dirPath;
      if(tagsFileName === undefined && wf !== undefined) {
        const wfPath = wf.uri.path.slice(1);
        while(true) {
          if(tagsDirPath === wfPath || tagsFileName !== undefined) {
            break;
          }
          tagsDirPath = tagsDirPath.replace(/(.+)\/[^\/]+$/, '$1');
          console.log(tagsDirPath);
          tagsFileName = tagsFileList.find(f => { return fs.existsSync(`${tagsDirPath}/${f}`); });
        }
      }
      if(tagsFileName === undefined) {
        console.error('tags file not found.');
        reject(result);
      }
      else {
        // filePath within tags file is 'foo/bar/file'
        const relativePart = tagsDirPath === dirPath
          ? '' : `${dirPath.slice(1 + tagsDirPath.length)}/`;
        const kindMap = config !== undefined ? config.kindMap : undefined;
        const rs = fs.createReadStream(`${tagsDirPath}/${tagsFileName}`);
        const lines = readline.createInterface(rs);
        let currentTreeTop = '';

        lines.on('line', line => {
          // currently read all lines. if 'not sorted by symbolname', to stop readline is better.
          const tokens = line.split('\t');
          if(tokens[1] === `${relativePart}${fileName}`) {
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

            symbolPositions.push(pos - 1);
            const currentSymbol = new vscode.DocumentSymbol(
              symbolName,
              '',
              kind,
              new vscode.Range(pos - 1, 0, pos, 10), // 10 and 'pos' has no meaning
              new vscode.Range(pos - 1, 0, pos - 1, 10)
            );
            currentSymbol.children = [];

            if(restartTree !== '') {
              if(restartTree.includes(tokens[3])) {
                result.push(currentSymbol);
                currentTreeTop = symbolName;
              }
              else if(currentTreeTop === '') {
                result.push(currentSymbol);
              }
              else {
                const parent = result.find(docSym => {
                  return docSym.name === currentTreeTop;
                });
                if(parent !== undefined) {
                  parent.children.push(currentSymbol);
                }
                else {
                  result.push(currentSymbol);
                }
              }
            }
            // case of rst2ctags.py
            // tokens[5] takes form of 'section:foo|bar...'
            else if(tokens.length > 5 && tokens[5] !== '' && sro !== '') {
              let parent: (vscode.DocumentSymbol | undefined) = undefined;
              for(const ancestor of tokens[5].slice(1 + tokens[5].indexOf(':')).split(sro)) {
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