import * as vscode from 'vscode';
import fs from 'fs';
import readline from 'readline';

export function activate(context: vscode.ExtensionContext) {

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
  const ftf = config.get<string[]>('fixedTagsFile');
  fixedTagsPathArray = ftf !== undefined ? ftf : [];
  const waitingFtf = fixedTagsPathArray.map(val => buildFixedTagsInfo(val));
  Promise.all(waitingFtf).then(_result => {
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
  }).catch(err => {
      vscode.window.showInformationMessage(`fixedTagsFile: ${err}`);
  });
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
let fixedTagsPathArray: string[] = [];
let configArray: Array<SbcTarget> = [];

type eachWorkspace = {
  mstimeMs: number,
  docRangeMap: Map<string, vscode.Range[]>,
  docSymbolMap: Map<string, vscode.DocumentSymbol[]>,
  wsSymbolArray: vscode.SymbolInformation[],
};
const allWorkspace = new Map<string, eachWorkspace>();
const fixedTagsspace = new Map<string, eachWorkspace>();

export class CtagsDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  public provideDocumentSymbols(
    document: vscode.TextDocument, _token: vscode.CancellationToken
    ): Promise<vscode.DocumentSymbol[]> {
    return getDocumentSymbols(document);
  }
};

export class CtagsWorkspaceSymbolProvider implements vscode.WorkspaceSymbolProvider {
  public provideWorkspaceSymbols(
    query: string, _token: vscode.CancellationToken
  ): Promise<vscode.SymbolInformation[]> {
    const ate = vscode.window.activeTextEditor;
    if(ate === undefined) {
      return Promise.resolve([]);
    }
    const eachWsInfo = getEachWsInfo(ate);
    const activeOne = (eachWsInfo !== undefined && eachWsInfo.wsSymbolArray !== undefined)
      ? eachWsInfo.wsSymbolArray.filter(si => si.name.includes(query))
      : [];
    const waiting: Promise<vscode.SymbolInformation[]>[] = [];
    fixedTagsspace.forEach(valWs => {
      waiting.push(new Promise(resolve => {
        resolve(valWs.wsSymbolArray.filter(si => si.name.includes(query)));
      }));
    });
    return Promise.all(waiting).then(resultFromFixed => {
      return resultFromFixed.reduce((acc, cur) => acc.concat(cur), [])
        .concat(activeOne);
    }).catch(_err => {
      return activeOne;
    });
  }
}

const getEachWsInfo = (textEditor: vscode.TextEditor): eachWorkspace | undefined => {
  const curWs = vscode.workspace.getWorkspaceFolder(textEditor.document.uri);
  if(curWs === undefined) {
    return undefined;
  }
  return allWorkspace.get(normalizePathAsKey(curWs.uri.path));
};

const getParentFixedTagsPath = (docFilePathAsKey: string) => {
  let result;
  for(const tagsPath of fixedTagsPathArray) {
    // user's inputs need to be normalize.
    const dir = normalizePathAsKey(tagsPath).replace(/(.+)\/[^\/]+$/, '$1');
    if(docFilePathAsKey.startsWith(dir)) {
      result = normalizePathAsKey(tagsPath);
      break;
    }
  }
  return result;
};

const getParentFixedTagsInfo = (docFilePathAsKey: string) => {
  let result;
  for(const tagsPath of fixedTagsspace.keys()) {
    // already normalized.
    const dir = tagsPath.replace(/(.+)\/[^\/]+$/, '$1');
    if(docFilePathAsKey.startsWith(dir)) {
      result = fixedTagsspace.get(tagsPath);
      break;
    }
  }
  return result;
};

const normalizePathAsKey = (filePath: string): string => {
  return filePath.replace(/^\/?([A-Za-z]){1}:\//, (_match, p1) => {
    return `${p1.toLowerCase()}:/`;
  });
};

const nextSymbol = (textEditor: vscode.TextEditor, prev = false) => {
  const docFilePath = normalizePathAsKey(textEditor.document.uri.path);
  let ws: eachWorkspace;
  const fixedTagsInfo = getParentFixedTagsInfo(docFilePath);
  if(fixedTagsInfo !== undefined && fixedTagsInfo.docRangeMap !== undefined) {
    ws = fixedTagsInfo;
  }
  else {
    const eachWsInfo = getEachWsInfo(textEditor);
    // illegal state, because this extension already began to work and doc was open.
    if(eachWsInfo === undefined || eachWsInfo.docRangeMap === undefined) {
      return;
    }
    ws = eachWsInfo;
  }
  const docRangeArray = ws.docRangeMap.get(docFilePath);
  nextSymbolSub(textEditor, prev, docRangeArray !== undefined ? docRangeArray : []);
};

const nextSymbolSub = (textEditor: vscode.TextEditor, prev: boolean, rangeArray: vscode.Range[]) => {
  const cursorPos = textEditor.selection.active;
  let nextSymbolRange = rangeArray.find(nthSymbol => cursorPos.isBefore(nthSymbol.start));
  if(prev) {
    nextSymbolRange = undefined;
    for(let i = rangeArray.length - 1;i > -1;i--) {
      if(cursorPos.isAfter(rangeArray[i].end)) {
        nextSymbolRange = rangeArray[i];
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

const getCleanConfig = (docUri: vscode.Uri) => {
  const wk = configArray.find(aConfig => {
    return undefined !== aConfig.ends.find(nameEnd => docUri.path.endsWith(nameEnd));
  });
  return {
    sro: (wk !== undefined && wk.sro !== undefined)
      ? wk.sro : '',
    restartTree: (wk !== undefined && wk.restartTree !== undefined)
      ? wk.restartTree : '',
    offSideRule: (wk !== undefined && wk.offSideRule !== undefined)
      ? wk.offSideRule : false,
    kindMap: wk !== undefined ? wk.kindMap :{},
  } as SbcTarget;
};

// not yet check whether it is necessary to read tags file again or not.
const getDocumentSymbols = (document: vscode.TextDocument): Promise<vscode.DocumentSymbol[]> => {
  // On win32, you get path such as /x:/path/to/folder
  const docFilePath = normalizePathAsKey(document.uri.path);
  if(getParentFixedTagsPath(docFilePath) !== undefined) {
    const fixedTagsInfo = getParentFixedTagsInfo(docFilePath);
    if(fixedTagsInfo !== undefined && fixedTagsInfo.docSymbolMap !== undefined) {
      const workaroundVar = fixedTagsInfo.docSymbolMap.get(docFilePath);
      if(workaroundVar !== undefined) {
        return Promise.resolve(workaroundVar);
      }
      else {
        return Promise.reject([]);
      }
    }
  }

  const wf = vscode.workspace.getWorkspaceFolder(document.uri);
  if(wf === undefined) {
    return Promise.reject([]);
  }
  const docDirFsPath = docFilePath.replace(/(.+)\/[^\/]+$/, '$1');
  let tagsFileName = tagsFileList.find(f => fs.existsSync(`${docDirFsPath}/${f}`));
  let tagsDirFsPath = docDirFsPath;
  const wfFsPath = normalizePathAsKey(wf.uri.path);
  if(tagsFileName === undefined) {
    while(true) {
      if(tagsDirFsPath === wfFsPath || tagsFileName !== undefined) {
        break;
      }
      tagsDirFsPath = tagsDirFsPath.replace(/(.+)\/[^\/]+$/, '$1');
      tagsFileName = tagsFileList.find(f => fs.existsSync(`${tagsDirFsPath}/${f}`));
    }
  }
  if(tagsFileName === undefined) {
    // notification may be over-reaction
    console.error('tags file not found.');
    return Promise.reject([]);
  }

  const tagsPath = `${tagsDirFsPath}/${tagsFileName}`;
  if(fs.existsSync(tagsPath) === false) {
    // return Promise.reject(`NOT EXIST ${tagsPath}`);
    console.log(`NOT EXIST ${tagsPath}`);
    return Promise.reject([]);
  }
  const lastMtimeMs = fs.statSync(`${tagsDirFsPath}/${tagsFileName}`).mtimeMs;

  // liveWsInfo is just a workaround.
  // I do not know why tsc ignores '=== undefined' and re-assigning to curWsInfo,
  // and eventually results in failure to compile.
  let liveWsInfo = allWorkspace.get(wfFsPath);
  // curWsInfo already exists, so let's see.
  if(liveWsInfo !== undefined) {
    if(liveWsInfo.mstimeMs === lastMtimeMs) { // NOT modified!
      const liveDocumentSymbols = liveWsInfo.docSymbolMap.get(docFilePath);
      if(liveDocumentSymbols !== undefined) {
        return Promise.resolve(liveDocumentSymbols);
      }
      else {
        return Promise.resolve([]); // empty in fact.
      }
    }
  }
  console.log('---- GO ----');

  const curWsInfo = {
    mstimeMs: lastMtimeMs,
    docRangeMap: new Map<string, vscode.Range[]>(),
    docSymbolMap: new Map<string, vscode.DocumentSymbol[]>(),
    wsSymbolArray: [],
  } as eachWorkspace;
  allWorkspace.set(wfFsPath, curWsInfo);

  return new Promise<vscode.DocumentSymbol[]>((resolve, _reject) => {
    buildSub(tagsPath, curWsInfo).then(_result => {
      resolve(curWsInfo.docSymbolMap.get(docFilePath));
    });
  });
};

const buildFixedTagsInfo = (pathInConfig: string) => {
  const tagsPath = normalizePathAsKey(pathInConfig);
  if(fs.existsSync(tagsPath) === false) {
    return Promise.reject(`NOT EXIST ${tagsPath}`);
  }
  const lastMtimeMs = fs.statSync(`${tagsPath}`).mtimeMs;
  const fixedTagsInfo = {
    mstimeMs: lastMtimeMs,
    docRangeMap: new Map<string, vscode.Range[]>(),
    docSymbolMap: new Map<string, vscode.DocumentSymbol[]>(),
    wsSymbolArray: [],
  } as eachWorkspace;
  fixedTagsspace.set(tagsPath, fixedTagsInfo);

  return buildSub(tagsPath, fixedTagsInfo);
};

const buildSub = (tagsPath: string, curWsInfo: eachWorkspace) => {
  const tagsDirFsPath = tagsPath.replace(/(.+)\/[^\/]+$/, '$1');
  let eachFileResult: vscode.DocumentSymbol[] = [];
  let currentTreeTop = '';
  let parentArray: [string, number][] = [];
  let lastFileNameInTokens = '';
  let lastFileUriInTokens: vscode.Uri;
  let lastLineNum = 0;
  let wkConfig: SbcTarget;

  const endOfSameFile = (docUri: vscode.Uri) => {
    if(wkConfig.offSideRule && parentArray.length > 0) {
      while(true) {
        if(parentArray.length === 0) {
          break;
        }
        const last = parentArray[parentArray.length - 1];
        let parent: (vscode.DocumentSymbol | undefined) = undefined;
        for(const ancestor of parentArray) {
          if(parent === undefined) { // 1st ansector
            parent = eachFileResult.find(docSym => docSym.name === ancestor[0]);
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
          // Except a document for which DocumentSymbolProvider was called, 
          // you can not get lineCount without opening file.
          // so the last parent symbol's end of range is uniformly set to the last position.
          parent.range = parent.range.with({end: new vscode.Position(lastLineNum - 1, 0)});
          parentArray.pop();
        }
      }
    }
    curWsInfo.docSymbolMap.set(normalizePathAsKey(docUri.path), eachFileResult);
  };
  const rs = fs.createReadStream(`${tagsPath}`);
  const lines = readline.createInterface(rs);

  return new Promise<boolean>((resolve, _reject) => {
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
      const fileUriInTokens = vscode.Uri.file(`${tagsDirFsPath}/${fileNameInTokens}`);

      if(lastFileNameInTokens === '') {
        lastFileNameInTokens = fileNameInTokens;
        lastFileUriInTokens = fileUriInTokens;
        lastLineNum = 0
        wkConfig = getCleanConfig(fileUriInTokens);
      }
      else if(fileNameInTokens !== lastFileNameInTokens) {
        endOfSameFile(lastFileUriInTokens);
        lastFileNameInTokens = fileNameInTokens;
        lastFileUriInTokens = fileUriInTokens;
        lastLineNum = 0
        wkConfig = getCleanConfig(fileUriInTokens);
        eachFileResult = [];
      }

      let kind = vscode.SymbolKind.Constructor; // no reason for Constructor
      if(wkConfig.kindMap[tokens[3]] !== undefined
        && kind2SymbolKind[wkConfig.kindMap[tokens[3]]] !== undefined) {
        kind = kind2SymbolKind[wkConfig.kindMap[tokens[3]]];
      }
      const posLine = tokens.length > 4
        ? parseInt(tokens[4].split(':')[1]) // lines:n
        : parseInt(tokens[2].replace(';"', '')); // nn;"
      lastLineNum = posLine;
      const innerRegex = tokens[2].startsWith('/') // /^  foo$/;"
        ? tokens[2].slice(2, tokens[2].length - 4)
        : '';
      const posCol = (tokens[2].startsWith('/') && innerRegex.indexOf(symbolName) !== -1)
        ? innerRegex.indexOf(symbolName)
        : 0;
      const symbolNameRange = new vscode.Range(posLine - 1, posCol, posLine - 1, posCol + symbolName.length);

      curWsInfo.wsSymbolArray.push(
        new vscode.SymbolInformation(
          symbolName,
          kind,
          fileNameInTokens,
          new vscode.Location(fileUriInTokens, symbolNameRange)
        )
      );

      let workSymbolRanges = curWsInfo.docRangeMap.get(fileUriInTokens.path);
      if(workSymbolRanges === undefined) {
        workSymbolRanges = [];
        curWsInfo.docRangeMap.set(fileUriInTokens.path, workSymbolRanges);
      }
      workSymbolRanges.push(symbolNameRange);

      const currentSymbol = new vscode.DocumentSymbol(
        symbolName,
        '',
        kind,
        new vscode.Range(posLine - 1, 0, posLine, 10), // 'posLine, 10' has no meaning
        symbolNameRange
      );
      currentSymbol.children = [];

      const indentRegex = /^[ ]+/g;
      if(wkConfig.offSideRule && innerRegex !== '') {
        const curIndent = indentRegex.exec(innerRegex) !== null
          ? indentRegex.lastIndex : 0;
        while(true) {
          if(parentArray.length === 0) {
            eachFileResult.push(currentSymbol);
            parentArray.push([ symbolName, curIndent ]);
            break;
          }
          const last = parentArray[parentArray.length - 1];
          let parent: (vscode.DocumentSymbol | undefined) = undefined;
          for(const ancestor of parentArray) {
            if(parent === undefined) { // 1st ansector
              parent = eachFileResult.find(docSym => docSym.name === ancestor[0]);
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
            eachFileResult.push(currentSymbol);
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
      else if(wkConfig.restartTree !== '') {
        if(wkConfig.restartTree.includes(tokens[3])) {
          eachFileResult.push(currentSymbol);
          currentTreeTop = symbolName;
        }
        else if(currentTreeTop === '') {
          eachFileResult.push(currentSymbol);
        }
        else {
          const parent = eachFileResult.find(docSym => docSym.name === currentTreeTop);
          if(parent !== undefined) {
            parent.children.push(currentSymbol);
          }
          else {
            eachFileResult.push(currentSymbol);
          }
        }
      }
      // case of rst2ctags.py
      // tokens[5] takes form of 'section:foo|bar...'
      else if(tokens.length > 5 && tokens[5] !== '' && wkConfig.sro !== '') {
        let parent: (vscode.DocumentSymbol | undefined) = undefined;
        for(const ancestor of tokens[5].slice(1 + tokens[5].indexOf(':')).split(wkConfig.sro)) {
          if(parent === undefined) { // 1st ansector
            parent = eachFileResult.find(docSym => docSym.name === ancestor);
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
          eachFileResult.push(currentSymbol);
        }
        else {
          parent.children.push(currentSymbol);
        }
      }
      else {
        eachFileResult.push(currentSymbol);
      }
    });

    lines.on('close', () => {
      endOfSameFile(lastFileUriInTokens);
      rs.destroy();
      resolve(true);
    });
  });
};
