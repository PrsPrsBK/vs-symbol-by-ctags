import * as vscode from 'vscode';
import fs from 'fs';
import readline from 'readline';
import { rejects } from 'assert';

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
  tags: string[];
  target: SbcTarget[];
}

interface SbcTarget {
  name: string;
  glob: string;
  ends: string[];
  kindMap: any;
  exec: string;
  tags: string[];
}

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
            if(kindMap !== undefined && kindMap[tokens[3]] !== undefined) {
              const kindSpec = kindMap[tokens[3]];
              if(kindSpec === 'Array') {
                kind = vscode.SymbolKind.Array;
              }
              else if(kindSpec === 'Boolean') {
                kind = vscode.SymbolKind.Boolean;
              }
              else if(kindSpec === 'Class') {
                kind = vscode.SymbolKind.Class;
              }
              else if(kindSpec === 'Constant') {
                kind = vscode.SymbolKind.Constant;
              }
              else if(kindSpec === 'Constructor') {
                kind = vscode.SymbolKind.Constructor;
              }
              else if(kindSpec === 'Enum') {
                kind = vscode.SymbolKind.Enum;
              }
              else if(kindSpec === 'EnumMember') {
                kind = vscode.SymbolKind.EnumMember;
              }
              else if(kindSpec === 'Event') {
                kind = vscode.SymbolKind.Event;
              }
              else if(kindSpec === 'Field') {
                kind = vscode.SymbolKind.Field;
              }
              else if(kindSpec === 'File') {
                kind = vscode.SymbolKind.File;
              }
              else if(kindSpec === 'Function') {
                kind = vscode.SymbolKind.Function;
              }
              else if(kindSpec === 'Interface') {
                kind = vscode.SymbolKind.Interface;
              }
              else if(kindSpec === 'Key') {
                kind = vscode.SymbolKind.Key;
              }
              else if(kindSpec === 'Method') {
                kind = vscode.SymbolKind.Method;
              }
              else if(kindSpec === 'Module') {
                kind = vscode.SymbolKind.Module;
              }
              else if(kindSpec === 'Namespace') {
                kind = vscode.SymbolKind.Namespace;
              }
              else if(kindSpec === 'Null') {
                kind = vscode.SymbolKind.Null;
              }
              else if(kindSpec === 'Number') {
                kind = vscode.SymbolKind.Number;
              }
              else if(kindSpec === 'Object') {
                kind = vscode.SymbolKind.Object;
              }
              else if(kindSpec === 'Operator') {
                kind = vscode.SymbolKind.Operator;
              }
              else if(kindSpec === 'Package') {
                kind = vscode.SymbolKind.Package;
              }
              else if(kindSpec === 'Property') {
                kind = vscode.SymbolKind.Property;
              }
              else if(kindSpec === 'String') {
                kind = vscode.SymbolKind.String;
              }
              else if(kindSpec === 'Struct') {
                kind = vscode.SymbolKind.Struct;
              }
              else if(kindSpec === 'TypeParameter') {
                kind = vscode.SymbolKind.TypeParameter;
              }
              else if(kindSpec === 'Variable') {
                kind = vscode.SymbolKind.Variable;
              }
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