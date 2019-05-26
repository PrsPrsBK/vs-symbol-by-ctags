import * as vscode from 'vscode';
import fs from 'fs';
import readline from 'readline';
import os from 'os';

export function activate(context: vscode.ExtensionContext) {
  console.log('"symbol-by-ctags" is now active!');

  const activateCommand = vscode.commands.registerCommand('extension.symbolByCtags', () => {
    vscode.window.showInformationMessage('activated: Symbol by Ctags');
  });
  context.subscriptions.push(activateCommand);

  const nextSymbolCommand = vscode.commands.registerTextEditorCommand(
    'extension.nextSymbol', (textEditor) => {
    nextSymbol(textEditor);
  });
  context.subscriptions.push(nextSymbolCommand);

  const prevSymbolCommand = vscode.commands.registerTextEditorCommand(
    'extension.prevSymbol', (textEditor) => {
    nextSymbol(textEditor, true);
  });
  context.subscriptions.push(prevSymbolCommand);

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
      configArray = targetArray;
      context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
          documentFilterArray,
          new CtagsDocumentSymbolProvider()
        )
      );
      context.subscriptions.push(
        vscode.languages.registerWorkspaceSymbolProvider(
          new CtagsWorkspaceSymbolProvider()
        )
      );
    }
  }
}

export function deactivate() { }

type SbcTarget = {
  name: string;
  glob: string;
  ends: string[];
  kindMap: {[key: string]: string};
  sro: string;
  restartTree: string;
  offSideRule: boolean;
};

const kind2SymbolKind: {[key: string]: vscode.SymbolKind} = {
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
let configArray: Array<SbcTarget> = [];

type eachWorkspace = {
  docRangeMap: Map<string, vscode.Range[]>,
  docSymbolMap: Map<string, vscode.DocumentSymbol[]>,
  wsSymbolArray: vscode.SymbolInformation[],
};
let allWorkspace = new Map<string, eachWorkspace>();
let docRangeMap = new Map<string, vscode.Range[]>();
let docSymbolMap = new Map<string, vscode.DocumentSymbol[]>();
let wsSymbolArray: vscode.SymbolInformation[] = [];

export class CtagsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument, _token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {

    return new Promise((resolve, reject) => {
      buildDocumentSymbols(document).then(result => {
        resolve(result);
      }).catch(err => {
        reject(err);
      });
    });
  }
};

export class CtagsWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  public provideWorkspaceSymbols(
    query: string, _token: vscode.CancellationToken
  ): vscode.SymbolInformation[] {
    const ate = vscode.window.activeTextEditor;
    if(ate === undefined) {
      return [];
    }
    const curWs = vscode.workspace.getWorkspaceFolder(ate.document.uri);
    if(curWs === undefined) {
      return [];
    }
    const eachWsInfo = allWorkspace.get(curWs.uri.path);
    if(eachWsInfo === undefined) {
      return [];
    }
    wsSymbolArray = eachWsInfo.wsSymbolArray;
    if(wsSymbolArray === undefined) {
      return [];
    }
    return wsSymbolArray.filter(si => si.name.includes(query));
  }
}

const nextSymbol = (textEditor: vscode.TextEditor, prev = false) => {
  const docSymArray = docSymbolMap.get(textEditor.document.uri.fsPath);
  if(docSymArray === undefined) {
    buildDocumentSymbols(textEditor.document).then(result => {
      nextSymbolSub(textEditor, prev);
    });
  }
  else {
    nextSymbolSub(textEditor, prev);
  }
};

const nextSymbolSub = (textEditor: vscode.TextEditor, prev: boolean) => {
  const cursorPos = textEditor.selection.active;
  let symbolRanges = docRangeMap.get(textEditor.document.uri.fsPath);
  if(symbolRanges === undefined) {
    return;
  }
  let nextSymbolRange = symbolRanges.find(nthSymbol => cursorPos.isBefore(nthSymbol.start));
  if(prev) {
    nextSymbolRange = undefined;
    for(let i = symbolRanges.length - 1;i > -1;i--) {
      if(cursorPos.isAfter(symbolRanges[i].end)) {
        nextSymbolRange = symbolRanges[i];
        break;
      }
    }
  }
  if(nextSymbolRange !== undefined) {
    textEditor.selection = new vscode.Selection(
      nextSymbolRange.start, nextSymbolRange.start
    );
    textEditor.revealRange(nextSymbolRange);
  }
};

// not yet check whether it is necessary to read tags file again or not.
const buildDocumentSymbols = (document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> => {
  const wf = vscode.workspace.getWorkspaceFolder(document.uri);
  if(wf !== undefined) {
    console.log(`wf: ${wf.uri.path}`);
  }
  // On win32, you get path such as /x:/path/to/folder
  const sliceFrom = os.platform() === 'win32' ? 1 : 0;
  //'.' means directory of code.exe
  const fileName = document.uri.path.replace(/.*\/([^\/]+)/, '$1');
  const dirPath = document.uri.path.replace(/(.+)\/[^\/]+$/, '$1').slice(sliceFrom);
  const config: (SbcTarget | undefined) = configArray.find(aConfig => {
    const wk = aConfig.ends.find(nameEnd => fileName.endsWith(nameEnd));
    return wk !== undefined;
  });
  // sro: Scope Resolution Operator, '::' in C++, '.' in Java.
  const sro: string = (config !== undefined && config.sro !== undefined)
    ? config.sro : '';
  // top of tree
  const restartTree: string = (config !== undefined && config.restartTree !== undefined)
    ? config.restartTree : '';
  const offSideRule: boolean = (config !== undefined && config.offSideRule !== undefined)
    ? config.offSideRule : false;

  const result: vscode.DocumentSymbol[] = [];
  // currently always refresh
  docRangeMap = new Map<string, vscode.Range[]>();
  wsSymbolArray = [];

  let tagsFileName = tagsFileList.find(f => fs.existsSync(`${dirPath}/${f}`));
  let tagsDirPath = dirPath;
  if(tagsFileName === undefined && wf !== undefined) {
    const wfPath = wf.uri.path.slice(sliceFrom);
    while(true) {
      if(tagsDirPath === wfPath || tagsFileName !== undefined) {
        break;
      }
      tagsDirPath = tagsDirPath.replace(/(.+)\/[^\/]+$/, '$1');
      tagsFileName = tagsFileList.find(f => fs.existsSync(`${tagsDirPath}/${f}`));
    }
  }

  return new Promise<vscode.DocumentSymbol[]>((resolve, reject) => {
    if(tagsFileName === undefined) {
      console.error('tags file not found.');
      reject(result);
    }
    else {
      // filePath within tags file is 'foo/bar/file'
      const relativePath = tagsDirPath === dirPath
        ? fileName
        : `${dirPath.slice(1 + tagsDirPath.length)}/${fileName}`;
      const kindMap = config !== undefined ? config.kindMap : undefined;
      const rs = fs.createReadStream(`${tagsDirPath}/${tagsFileName}`);
      const lines = readline.createInterface(rs);
      let currentTreeTop = '';
      let parentArray: [string, number][] = [];

      lines.on('line', line => {
        if(line.startsWith('!_TAG_')) {
          return;
        }

        // currently read all lines. if 'not sorted by symbolname', to stop readline is better.
        const tokens = line.split('\t');

        const symbolName = tokens[0];
        // On Windows, spec within tags file may have paths separated by backslash.
        const fileNameInTokens = tokens[1].replace(/\\/g, '/');
        // Maybe it is better to validate path.
        const fileUriInTokens = vscode.Uri.file(`${tagsDirPath}/${fileNameInTokens}`);

        let kind = vscode.SymbolKind.Constructor; // no reason for Constructor
        if(kindMap !== undefined
          && kindMap[tokens[3]] !== undefined
          && kind2SymbolKind[kindMap[tokens[3]]] !== undefined) {
          kind = kind2SymbolKind[kindMap[tokens[3]]];
        }
        const posLine = tokens.length > 4
          ? parseInt(tokens[4].split(':')[1]) // lines:n
          : parseInt(tokens[2].replace(';"', '')); // nn;"
        const innerRegex = tokens[2].startsWith('/') // /^  foo$/;"
          ? tokens[2].slice(2, tokens[2].length - 4)
          : '';
        const posCol = (tokens[2].startsWith('/') && innerRegex.indexOf(symbolName) !== -1)
          ? innerRegex.indexOf(symbolName)
          : 0;
        const symbolNameRange = new vscode.Range(posLine - 1, posCol, posLine - 1, posCol + symbolName.length);

        wsSymbolArray.push(
          new vscode.SymbolInformation(
            symbolName,
            kind,
            fileNameInTokens,
            new vscode.Location(fileUriInTokens, symbolNameRange)
          )
        );

        // docSymbolRanges.get() ALWAYS has possibility of 'undefined',
        // even if after if(...has()) checked. so workVar is necessary.
        let workSymbolRanges: vscode.Range[] | undefined = docRangeMap.get(fileUriInTokens.fsPath);
        if(workSymbolRanges === undefined) {
          workSymbolRanges = [];
        }
        workSymbolRanges.push(symbolNameRange);
        docRangeMap.set(fileUriInTokens.fsPath, workSymbolRanges);

        if(fileNameInTokens === relativePath) {

          const currentSymbol = new vscode.DocumentSymbol(
            symbolName,
            '',
            kind,
            new vscode.Range(posLine - 1, 0, posLine, 10), // 'posLine, 10' has no meaning
            symbolNameRange
          );
          currentSymbol.children = [];

          const indentRegex = /^[ ]+/g;
          if(offSideRule && innerRegex !== '') {
            const curIndent = indentRegex.exec(innerRegex) !== null
              ? indentRegex.lastIndex : 0;
            while(true) {
              if(parentArray.length === 0) {
                result.push(currentSymbol);
                parentArray.push([ symbolName, curIndent ]);
                break;
              }
              const last = parentArray[parentArray.length - 1];
              let parent: (vscode.DocumentSymbol | undefined) = undefined;
              for(const ancestor of parentArray) {
                if(parent === undefined) { // 1st ansector
                  parent = result.find(docSym => docSym.name === ancestor[0]);
                }
                else {
                  parent = parent.children.find(docSym => docSym.name === ancestor[0]);
                }
                if(parent === undefined) { // failed one
                  break;
                }
              }
              if(parent === undefined) {
                console.error(`${new Date().toLocaleTimeString()} ERROR: ${symbolName}: at symbol hierarchy spec within tags file`);
                result.push(currentSymbol);
                // when failed to get parent symbol obj, there may be better way to go,
                // but I do not know now.
                parentArray = [];
              }
              else if(last[1] < curIndent) {
                parent.children.push(currentSymbol);
                parentArray.push([ symbolName, curIndent ]);
                break;
              }
              else {
                parent.range = parent.range.with({end: new vscode.Position(posLine - 1, 0)});
                parentArray.pop();
              }
            }
          }
          else if(restartTree !== '') {
            if(restartTree.includes(tokens[3])) {
              result.push(currentSymbol);
              currentTreeTop = symbolName;
            }
            else if(currentTreeTop === '') {
              result.push(currentSymbol);
            }
            else {
              const parent = result.find(docSym => docSym.name === currentTreeTop);
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
                parent = result.find(docSym => docSym.name === ancestor);
              }
              else {
                parent = parent.children.find(docSym => docSym.name === ancestor);
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
        if(offSideRule && parentArray.length > 0) {
          while(true) {
            if(parentArray.length === 0) {
              break;
            }
            const last = parentArray[parentArray.length - 1];
            let parent: (vscode.DocumentSymbol | undefined) = undefined;
            for(const ancestor of parentArray) {
              if(parent === undefined) { // 1st ansector
                parent = result.find(docSym => docSym.name === ancestor[0]);
              }
              else {
                parent = parent.children.find(docSym => docSym.name === ancestor[0]);
              }
              if(parent === undefined) { // failed one
                break;
              }
            }
            if(parent === undefined) {
              console.error(`${new Date().toLocaleTimeString()} ERROR: ${last[0]}: at symbol hierarchy spec within tags file`);
              parentArray = [];
            }
            else {
              parent.range = parent.range.with({end: new vscode.Position(document.lineCount - 1, 0)});
              parentArray.pop();
            }
          }
        }
        rs.destroy();
        docSymbolMap.set(document.uri.fsPath, result);
        resolve(result);
      });
    }
  });
};
